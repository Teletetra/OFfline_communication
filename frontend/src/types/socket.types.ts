export interface SocketMessageEvent{messageId?:string;conversationId?:string;senderId?:string;receiverId?:string;content?:string;status?:string;createdAt?:string;}
export interface PresenceEvent{userId:string;}
export interface TypingEvent{senderId?:string;receiverId?:string;}
export type ConnectionState='connected'|'disconnected'|'error';
