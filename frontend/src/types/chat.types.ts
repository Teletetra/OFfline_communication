export type MessageStatus='pending'|'sent'|'delivered'|'read'|'failed';
export interface ChatMessage{id:string;conversationId?:string;senderId:string;receiverId?:string;content:string;type?:string;status?:MessageStatus;createdAt:string|Date;transmissionMode?:'internet'|'bluetooth'|'offline';}
export interface Conversation{id:string;participant1Id:string;participant2Id:string;participant1?:any;participant2?:any;lastMessage?:ChatMessage;unreadCount?:number;updatedAt?:string;}
