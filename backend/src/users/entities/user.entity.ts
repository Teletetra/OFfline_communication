// backend/src/users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, BeforeInsert } from 'typeorm';
import { Message } from '../../chat/entities/message.entity';
import { Conversation } from '../../chat/entities/conversation.entity';
import * as bcrypt from 'bcrypt';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen: Date;

  @Column({ type: 'json', nullable: true })
  publicKey: string;

  @Column({ type: 'json', nullable: true })
  deviceInfo: {
    bluetoothEnabled: boolean;
    deviceName: string;
    lastConnectedDevice: string;
  };

  @OneToMany(() => Message, message => message.sender)
  sentMessages: Message[];

  @OneToMany(() => Message, message => message.receiver)
  receivedMessages: Message[];

  @OneToMany(() => Conversation, conversation => conversation.participant1)
  conversations1: Conversation[];

  @OneToMany(() => Conversation, conversation => conversation.participant2)
  conversations2: Conversation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async comparePassword(attempt: string): Promise<boolean> {
    return await bcrypt.compare(attempt, this.password);
  }
}