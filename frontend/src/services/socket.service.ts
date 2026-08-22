// frontend/src/services/socketService.ts
import { io, Socket } from 'socket.io-client';
import { useChatStore } from '../store/chatStore';
import { useNotificationStore } from '../store/notificationStore';

export class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(userId: string, token: string) {
    if (this.socket?.connected) return;

    this.socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
      path: '/chat',
      auth: {
        userId,
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
      useChatStore.getState().setConnectionStatus('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      useChatStore.getState().setConnectionStatus('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      useChatStore.getState().setConnectionStatus('error');
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        // Try Bluetooth fallback
        useChatStore.getState().enableBluetoothMode();
      }
    });

    this.socket.on('message:receive', (message) => {
      useChatStore.getState().addMessage(message);
      
      if (document.hidden) {
        useNotificationStore.getState().showNotification({
          title: 'New Message',
          body: message.content,
          data: { conversationId: message.conversationId },
        });
      }
    });

    this.socket.on('message:sent', (data) => {
      useChatStore.getState().updateMessageStatus(data.messageId, 'sent');
    });

    this.socket.on('message:delivered', (data) => {
      useChatStore.getState().updateMessageStatus(data.messageId, 'delivered');
    });

    this.socket.on('message:read-confirmation', (data) => {
      useChatStore.getState().updateMessageStatus(data.messageId, 'read');
    });

    this.socket.on('user:online', (data) => {
      useChatStore.getState().updateUserPresence(data.userId, true);
    });

    this.socket.on('user:offline', (data) => {
      useChatStore.getState().updateUserPresence(data.userId, false);
    });

    this.socket.on('typing:start', (data) => {
      useChatStore.getState().setTypingUser(data.senderId, true);
    });

    this.socket.on('typing:stop', (data) => {
      useChatStore.getState().setTypingUser(data.senderId, false);
    });
  }

  sendMessage(payload: any) {
    if (this.socket?.connected) {
      this.socket.emit('message:send', payload);
      return true;
    }
    return false;
  }

  sendTypingStart(receiverId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing:start', { receiverId });
    }
  }

  sendTypingStop(receiverId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing:stop', { receiverId });
    }
  }

  markMessagesAsRead(messageIds: string[]) {
    if (this.socket?.connected) {
      this.socket.emit('message:read', { messageIds });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default SocketService.getInstance();