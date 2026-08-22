export const Events = {
  MessageReceived: 'message.received', MessageSent: 'message.sent', MessageDelivered: 'message.delivered', MessageRead: 'message.read', UserOnline: 'user.online', UserOffline: 'user.offline', TypingStart: 'typing.start', TypingStop: 'typing.stop', NotificationCreated: 'notification.created'
} as const;
export type EventName = typeof Events[keyof typeof Events];