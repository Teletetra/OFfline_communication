// backend/src/chat/entities/message.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  encryptedContent: string;

  @Column({ default: 'text' })
  type: 'text' | 'image' | 'file' | 'voice' | 'video';

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ default: 'sent' })
  status: 'sent' | 'delivered' | 'read' | 'failed';

  @Column({ default: 'online' })
  transmissionMode: 'online' | 'bluetooth' | 'hybrid';

  @Column({ type: 'json', nullable: true })
  metadata: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
    encryptionMethod?: string;
  };

  @Column({ type: 'boolean', default: true })
  isEncrypted: boolean;

  @ManyToOne(() => User, user => user.sentMessages)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column()
  senderId: string;

  @ManyToOne(() => User, user => user.receivedMessages)
  @JoinColumn({ name: 'receiverId' })
  receiver: User;

  @Column()
  receiverId: string;

  @ManyToOne(() => Conversation, conversation => conversation.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  conversationId: string;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}