import { create } from 'zustand';
import { useAuthStore } from './authStore';
import socketService from '../services/socketService';
import { bluetoothService } from '../services/bluetooth.service';

export type ConnectionStatus = 'connected' | 'disconnected' | 'error';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversationId?: string;
  senderId: string;
  receiverId?: string;
  content: string;
  type?: string;
  status?: MessageStatus;
  createdAt: string | Date;
  transmissionMode?: 'internet' | 'bluetooth' | 'offline';
}

export interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  participant1?: any;
  participant2?: any;
  lastMessage?: Message;
  unreadCount?: number;
  updatedAt?: string;
}

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  activeConversationId: string | null;
  connectionStatus: ConnectionStatus;
  bluetoothMode: boolean;
  typingUsers: Record<string, boolean>;
  currentUser: any;
  setConnectionStatus: (status: ConnectionStatus) => void;
  enableBluetoothMode: () => void;
  setActiveConversation: (id: string | null) => void;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
  addMessage: (message: Message) => void;
  addOfflineMessage: (message: Message) => void;
  updateMessageStatus: (id: string, status: MessageStatus) => void;
  updateUserPresence: (userId: string, online: boolean) => void;
  setTypingUser: (userId: string, typing: boolean) => void;
  markConversationAsRead: (id: string) => void;
  initializeSocket: (userId: string) => void;
  disconnectSocket: () => void;
  initializeBluetooth: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function api(path: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Request failed');
  return response.json();
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversationId: null,
  connectionStatus: 'disconnected',
  bluetoothMode: false,
  typingUsers: {},
  currentUser: null,

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  enableBluetoothMode: () => set({ bluetoothMode: true }),
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),

  loadConversations: async () => {
    try {
      const data = await api('/conversations');
      set({ conversations: data.conversations || data || [], currentUser: useAuthStore.getState().user });
    } catch (error) {
      console.error('Failed to load conversations', error);
    }
  },

  loadMessages: async (conversationId) => {
    try {
      const data = await api(`/conversations/${conversationId}/messages`);
      set((state) => ({ messages: { ...state.messages, [conversationId]: data.messages || data || [] } }));
    } catch (error) {
      console.error('Failed to load messages', error);
    }
  },

  sendMessage: async (receiverId, content) => {
    const conversation = get().conversations.find((c) => c.participant1Id === receiverId || c.participant2Id === receiverId);
    const conversationId = conversation?.id;
    const payload = { receiverId, conversationId, content, type: 'text', clientMessageId: crypto.randomUUID() };
    const sent = socketService.sendMessage(payload);
    if (!sent) {
      try {
        await bluetoothService.sendMessageViaBluetooth(receiverId, content);
      } catch {
        const offline: Message = { id: payload.clientMessageId, conversationId, senderId: useAuthStore.getState().user?.id || '', receiverId, content, status: 'pending', createdAt: new Date(), transmissionMode: 'offline' };
        if (conversationId) get().addOfflineMessage(offline);
      }
    }
  },

  addMessage: (message) => set((state) => {
    const id = message.conversationId || 'unknown';
    const existing = state.messages[id] || [];
    if (existing.some((m) => m.id === message.id)) return state;
    return { messages: { ...state.messages, [id]: [...existing, message] } };
  }),

  addOfflineMessage: (message) => get().addMessage(message),

  updateMessageStatus: (id, status) => set((state) => {
    const messages = Object.fromEntries(Object.entries(state.messages).map(([key, list]) => [key, list.map((m) => m.id === id ? { ...m, status } : m)]));
    return { messages };
  }),

  updateUserPresence: (userId, online) => set((state) => ({ conversations: state.conversations.map((c) => ({ ...c, participant1: c.participant1?.id === userId ? { ...c.participant1, isOnline: online } : c.participant1, participant2: c.participant2?.id === userId ? { ...c.participant2, isOnline: online } : c.participant2 })) })),
  setTypingUser: (userId, typing) => set((state) => ({ typingUsers: { ...state.typingUsers, [userId]: typing } })),
  markConversationAsRead: (id) => set((state) => ({ conversations: state.conversations.map((c) => c.id === id ? { ...c, unreadCount: 0 } : c) })),

  initializeSocket: (userId) => socketService.connect(userId, useAuthStore.getState().token || ''),
  disconnectSocket: () => socketService.disconnect(),
  initializeBluetooth: async () => { await bluetoothService.initialize(); },
}));