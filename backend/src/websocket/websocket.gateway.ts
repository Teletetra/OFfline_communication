// backend/src/websocket/websocket.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WebSocketJwtGuard } from './guards/websocket-jwt.guard';
import { ChatService } from '../chat/chat.service';
import { UsersService } from '../users/users.service';
import { EncryptionService } from '../encryption/encryption.service';
import { QueueService } from '../queue/queue.service';
import { RedisService } from '../cache/cache.service';
import { SocketSession } from './interfaces/socket-session.interface';
import { Events } from '../common/constants/events';
import { v4 as uuidv4 } from 'uuid';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 5000,
})
@Injectable()
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private readonly sessions = new Map<string, SocketSession>();
  private readonly userSockets = new Map<string, Set<string>>();
  private readonly typingTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly usersService: UsersService,
    private readonly encryptionService: EncryptionService,
    private readonly queueService: QueueService,
    private readonly redisService: RedisService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    
    // Setup Redis adapter for horizontal scaling
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const payload = await this.jwtService.verifyAsync(token);
        socket.data.userId = payload.sub;
        socket.data.user = payload;
        
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  async handleConnection(client: Socket) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        client.disconnect();
        return;
      }

      // Create session
      const session: SocketSession = {
        socketId: client.id,
        userId,
        connectedAt: new Date(),
        userAgent: client.handshake.headers['user-agent'],
        ipAddress: client.handshake.address,
        metadata: client.handshake.auth.metadata || {},
      };

      this.sessions.set(client.id, session);

      // Track user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(client.id);

      // Update user presence in Redis and database
      await this.redisService.setUserPresence(userId, true);
      await this.usersService.updatePresence(userId, true);

      // Broadcast user online status
      this.server.emit(Events.USER_ONLINE, {
        userId,
        isOnline: true,
        timestamp: new Date(),
      });

      // Send pending messages
      await this.sendPendingMessages(client, userId);

      // Send connection acknowledgment
      client.emit(Events.CONNECTION_ACK, {
        userId,
        timestamp: new Date(),
        sessionId: uuidv4(),
      });

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const session = this.sessions.get(client.id);
      if (!session) return;

      const { userId } = session;
      
      // Clean up session
      this.sessions.delete(client.id);
      
      // Remove socket from user sockets
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
          
          // Update user presence in Redis and database
          await this.redisService.setUserPresence(userId, false);
          await this.usersService.updatePresence(userId, false);
          await this.usersService.updateLastSeen(userId, new Date());
          
          // Broadcast user offline status
          this.server.emit(Events.USER_OFFLINE, {
            userId,
            isOnline: false,
            lastSeen: new Date(),
          });
        }
      }

      // Clear typing timeout
      const typingTimeout = this.typingTimeouts.get(userId);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        this.typingTimeouts.delete(userId);
      }

      this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error('Disconnection error:', error);
    }
  }

  @UseGuards(WebSocketJwtGuard)
  @SubscribeMessage(Events.SEND_MESSAGE)
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const userId = client.data.userId;
    
    try {
      const { receiverId, content, type, metadata, conversationId } = payload;

      // Validate message
      if (!content && !metadata?.fileUrl) {
        throw new WsException('Message content is required');
      }

      // Encrypt message for E2EE
      const encryptedContent = await this.encryptionService.encryptMessage(content);
      
      // Save message to database
      const message = await this.chatService.createMessage({
        senderId: userId,
        receiverId,
        content,
        encryptedContent,
        type: type || 'text',
        metadata,
        conversationId,
        status: 'sent',
        transmissionMode: 'online',
        isEncrypted: true,
      });

      // Send message to receiver if online
      const receiverSockets = this.userSockets.get(receiverId);
      if (receiverSockets && receiverSockets.size > 0) {
        receiverSockets.forEach(socketId => {
          this.server.to(socketId).emit(Events.MESSAGE_RECEIVED, message);
        });
        
        // Update message status to delivered
        await this.chatService.updateMessageStatus(message.id, 'delivered');
        
        // Send delivery confirmation to sender
        client.emit(Events.MESSAGE_DELIVERED, {
          messageId: message.id,
          deliveredAt: new Date(),
        });
      } else {
        // Queue message for offline delivery
        await this.queueService.addJob('offline-message', {
          messageId: message.id,
          receiverId,
        });
      }

      // Send confirmation to sender
      client.emit(Events.MESSAGE_SENT, {
        messageId: message.id,
        status: 'sent',
        timestamp: new Date(),
      });

      return {
        success: true,
        messageId: message.id,
        message,
      };
    } catch (error) {
      this.logger.error('Send message error:', error);
      client.emit(Events.MESSAGE_ERROR, {
        error: error.message,
        timestamp: new Date(),
      });
      throw new WsException(error.message);
    }
  }

  @UseGuards(WebSocketJwtGuard)
  @SubscribeMessage(Events.READ_MESSAGE)
  async handleReadMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageIds: string[] },
  ) {
    const userId = client.data.userId;
    
    try {
      await this.chatService.markMessagesAsRead(payload.messageIds, userId);
      
      // Notify senders
      for (const messageId of payload.messageIds) {
        const message = await this.chatService.getMessage(messageId);
        if (message) {
          const senderSockets = this.userSockets.get(message.senderId);
          if (senderSockets) {
            senderSockets.forEach(socketId => {
              this.server.to(socketId).emit(Events.MESSAGE_READ, {
                messageId,
                readBy: userId,
                readAt: new Date(),
              });
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Read message error:', error);
      throw new WsException(error.message);
    }
  }

  @UseGuards(WebSocketJwtGuard)
  @SubscribeMessage(Events.TYPING_START)
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: string; conversationId: string },
  ) {
    const userId = client.data.userId;
    const { receiverId, conversationId } = payload;

    // Clear existing timeout
    const existingTimeout = this.typingTimeouts.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.handleTypingStop(client, payload);
      this.typingTimeouts.delete(userId);
    }, 3000);

    this.typingTimeouts.set(userId, timeout);

    // Notify receiver
    const receiverSockets = this.userSockets.get(receiverId);
    if (receiverSockets) {
      receiverSockets.forEach(socketId => {
        this.server.to(socketId).emit(Events.TYPING_START, {
          userId,
          conversationId,
          timestamp: new Date(),
        });
      });
    }
  }

  @UseGuards(WebSocketJwtGuard)
  @SubscribeMessage(Events.TYPING_STOP)
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: string; conversationId: string },
  ) {
    const userId = client.data.userId;
    const { receiverId, conversationId } = payload;

    // Clear timeout
    const timeout = this.typingTimeouts.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(userId);
    }

    // Notify receiver
    const receiverSockets = this.userSockets.get(receiverId);
    if (receiverSockets) {
      receiverSockets.forEach(socketId => {
        this.server.to(socketId).emit(Events.TYPING_STOP, {
          userId,
          conversationId,
          timestamp: new Date(),
        });
      });
    }
  }

  @UseGuards(WebSocketJwtGuard)
  @SubscribeMessage(Events.PRESENCE_REQUEST)
  async handlePresenceRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userIds: string[] },
  ) {
    const presenceData = [];
    
    for (const userId of payload.userIds) {
      const isOnline = await this.redisService.getUserPresence(userId);
      presenceData.push({
        userId,
        isOnline,
        lastSeen: await this.redisService.getUserLastSeen(userId),
      });
    }

    client.emit(Events.PRESENCE_UPDATE, presenceData);
  }

  private async sendPendingMessages(client: Socket, userId: string) {
    try {
      const pendingMessages = await this.chatService.getPendingMessages(userId);
      
      for (const message of pendingMessages) {
        client.emit(Events.MESSAGE_RECEIVED, message);
        
        // Mark as delivered
        await this.chatService.updateMessageStatus(message.id, 'delivered');
        
        // Notify sender
        const senderSockets = this.userSockets.get(message.senderId);
        if (senderSockets) {
          senderSockets.forEach(socketId => {
            this.server.to(socketId).emit(Events.MESSAGE_DELIVERED, {
              messageId: message.id,
              deliveredAt: new Date(),
            });
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to send pending messages:', error);
    }
  }
}