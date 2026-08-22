// backend/src/websocket/websocket.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { ChatService } from '../chat/chat.service';
import { EncryptionService } from '../encryption/encryption.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private logger = new Logger('ChatGateway');
  private onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private chatService: ChatService,
    private encryptionService: EncryptionService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const userId = client.handshake.auth.userId;
      if (!userId) {
        client.disconnect();
        return;
      }

      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId).add(client.id);

      // Broadcast user online status
      this.server.emit('user:online', { userId, isOnline: true });
      
      // Send pending messages
      const pendingMessages = await this.chatService.getPendingMessages(userId);
      pendingMessages.forEach(msg => {
        client.emit('message:receive', msg);
      });

      this.logger.log(`Client connected: ${client.id}, User: ${userId}`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.auth.userId;
    if (userId && this.onlineUsers.has(userId)) {
      this.onlineUsers.get(userId).delete(client.id);
      if (this.onlineUsers.get(userId).size === 0) {
        this.onlineUsers.delete(userId);
        this.server.emit('user:offline', { userId, isOnline: false });
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    try {
      const senderId = client.handshake.auth.userId;
      const { receiverId, content, type, metadata } = payload;

      // Encrypt message content
      const encryptedContent = await this.encryptionService.encrypt(content);

      // Save message to database
      const message = await this.chatService.createMessage({
        senderId,
        receiverId,
        content,
        encryptedContent,
        type,
        metadata,
        isEncrypted: true,
      });

      // Send to receiver if online
      const receiverSockets = this.onlineUsers.get(receiverId);
      if (receiverSockets && receiverSockets.size > 0) {
        receiverSockets.forEach(socketId => {
          this.server.to(socketId).emit('message:receive', message);
        });
        await this.chatService.updateMessageStatus(message.id, 'delivered');
      }

      // Confirm to sender
      client.emit('message:sent', { messageId: message.id, status: 'sent' });

      return { success: true, messageId: message.id };
    } catch (error) {
      this.logger.error('Message send error:', error);
      client.emit('message:error', { error: 'Failed to send message' });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageIds: string[] },
  ) {
    const userId = client.handshake.auth.userId;
    await this.chatService.markMessagesAsRead(payload.messageIds, userId);
    
    // Notify senders
    payload.messageIds.forEach(messageId => {
      this.server.emit('message:read-confirmation', { messageId, readBy: userId });
    });
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: string },
  ) {
    const senderId = client.handshake.auth.userId;
    const receiverSockets = this.onlineUsers.get(payload.receiverId);
    if (receiverSockets) {
      receiverSockets.forEach(socketId => {
        this.server.to(socketId).emit('typing:start', { senderId });
      });
    }
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: string },
  ) {
    const senderId = client.handshake.auth.userId;
    const receiverSockets = this.onlineUsers.get(payload.receiverId);
    if (receiverSockets) {
      receiverSockets.forEach(socketId => {
        this.server.to(socketId).emit('typing:stop', { senderId });
      });
    }
  }

  @SubscribeMessage('presence:request')
  handlePresenceRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userIds: string[] },
  ) {
    const presenceData = payload.userIds.map(userId => ({
      userId,
      isOnline: this.onlineUsers.has(userId),
    }));
    client.emit('presence:update', presenceData);
  }
}