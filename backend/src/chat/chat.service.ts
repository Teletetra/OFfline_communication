// backend/src/chat/chat.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, MoreThan, LessThan } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Participant } from './entities/participant.entity';
import { UsersService } from '../users/users.service';
import { EncryptionService } from '../encryption/encryption.service';
import { CacheService } from '../cache/cache.service';
import { QueueService } from '../queue/queue.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
    private readonly usersService: UsersService,
    private readonly encryptionService: EncryptionService,
    private readonly cacheService: CacheService,
    private readonly queueService: QueueService,
  ) {}

  async createConversation(
    creatorId: string,
    participantIds: string[],
    conversationData: Partial<Conversation>,
  ): Promise<Conversation> {
    // Validate participants
    if (!participantIds.includes(creatorId)) {
      participantIds.push(creatorId);
    }

    const uniqueParticipantIds = [...new Set(participantIds)];
    
    if (uniqueParticipantIds.length < 2) {
      throw new BadRequestException('Conversation requires at least 2 participants');
    }

    // Check if direct conversation already exists
    if (uniqueParticipantIds.length === 2) {
      const existingConversation = await this.findDirectConversation(
        uniqueParticipantIds[0],
        uniqueParticipantIds[1],
      );
      
      if (existingConversation) {
        return existingConversation;
      }
    }

    // Create conversation
    const conversation = this.conversationRepository.create({
      ...conversationData,
      type: uniqueParticipantIds.length === 2 ? 'direct' : 'group',
      creatorId,
    });

    await this.conversationRepository.save(conversation);

    // Add participants
    const participants = uniqueParticipantIds.map(userId => ({
      conversationId: conversation.id,
      userId,
      role: userId === creatorId ? 'admin' : 'member',
      joinedAt: new Date(),
    }));

    await this.participantRepository.save(participants);

    // Invalidate cache
    await this.cacheService.invalidateUserConversations(creatorId);
    uniqueParticipantIds.forEach(async (userId) => {
      if (userId !== creatorId) {
        await this.cacheService.invalidateUserConversations(userId);
      }
    });

    // Notify participants
    await this.queueService.addJob('conversation-created', {
      conversationId: conversation.id,
      participantIds: uniqueParticipantIds,
    });

    return conversation;
  }

  async getConversations(
    userId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponse<Conversation>> {
    const { page = 1, limit = 20 } = paginationQuery;
    const cacheKey = `conversations:${userId}:${page}:${limit}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [conversations, total] = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin('conversation.participants', 'participant')
      .where('participant.userId = :userId', { userId })
      .leftJoinAndSelect('conversation.participants', 'allParticipants')
      .leftJoinAndSelect('allParticipants.user', 'user')
      .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
      .orderBy('conversation.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const result = {
      data: conversations,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache result
    await this.cacheService.set(cacheKey, JSON.stringify(result), 60);

    return result;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponse<Message>> {
    // Check if user is participant
    const isParticipant = await this.isConversationParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    const { page = 1, limit = 50 } = paginationQuery;
    const cacheKey = `messages:${conversationId}:${page}:${limit}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [messages, total] = await this.messageRepository.findAndCount({
      where: { conversationId },
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const result = {
      data: messages.reverse(),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache result
    await this.cacheService.set(cacheKey, JSON.stringify(result), 30);

    return result;
  }

  async createMessage(messageData: Partial<Message>): Promise<Message> {
    const message = this.messageRepository.create(messageData);
    await this.messageRepository.save(message);

    // Update conversation last message and timestamp
    await this.conversationRepository.update(
      messageData.conversationId,
      {
        lastMessageId: message.id,
        updatedAt: new Date(),
      },
    );

    // Invalidate cache
    await this.cacheService.invalidateConversationMessages(messageData.conversationId);
    
    const participants = await this.getConversationParticipants(messageData.conversationId);
    participants.forEach(async (participant) => {
      await this.cacheService.invalidateUserConversations(participant.userId);
    });

    return message;
  }

  async updateMessageStatus(
    messageId: string,
    status: Message['status'],
  ): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const updateData: Partial<Message> = { status };

    if (status === 'delivered' && !message.deliveredAt) {
      updateData.deliveredAt = new Date();
    }

    if (status === 'read' && !message.readAt) {
      updateData.readAt = new Date();
    }

    await this.messageRepository.update(messageId, updateData);

    return this.messageRepository.findOne({ where: { id: messageId } });
  }

  async markMessagesAsRead(messageIds: string[], userId: string): Promise<void> {
    const messages = await this.messageRepository.find({
      where: { id: In(messageIds), receiverId: userId },
    });

    for (const message of messages) {
      if (!message.readAt) {
        await this.messageRepository.update(message.id, {
          status: 'read',
          readAt: new Date(),
        });
      }
    }
  }

  async getPendingMessages(userId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: {
        receiverId: userId,
        status: 'sent',
      },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }

  async searchMessages(
    userId: string,
    searchQuery: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponse<Message>> {
    const { page = 1, limit = 20 } = paginationQuery;

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.conversation', 'conversation')
      .innerJoin('conversation.participants', 'participant')
      .where('participant.userId = :userId', { userId })
      .andWhere('message.content ILIKE :searchQuery', {
        searchQuery: `%${searchQuery}%`,
      })
      .orderBy('message.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [messages, total] = await queryBuilder.getManyAndCount();

    return {
      data: messages,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Soft delete
    await this.messageRepository.update(messageId, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    // Soft delete conversation for this user
    await this.participantRepository.update(participant.id, {
      isDeleted: true,
      leftAt: new Date(),
    });

    // If all participants have left, delete conversation
    const activeParticipants = await this.participantRepository.count({
      where: { conversationId, isDeleted: false },
    });

    if (activeParticipants === 0) {
      await this.conversationRepository.update(conversationId, {
        isDeleted: true,
        deletedAt: new Date(),
      });
    }
  }

  private async findDirectConversation(
    userId1: string,
    userId2: string,
  ): Promise<Conversation | null> {
    return this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin('conversation.participants', 'p1')
      .innerJoin('conversation.participants', 'p2')
      .where('conversation.type = :type', { type: 'direct' })
      .andWhere('p1.userId = :userId1', { userId1 })
      .andWhere('p2.userId = :userId2', { userId2 })
      .getOne();
  }

  private async isConversationParticipant(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId, isDeleted: false },
    });

    return !!participant;
  }

  private async getConversationParticipants(conversationId: string): Promise<Participant[]> {
    return this.participantRepository.find({
      where: { conversationId, isDeleted: false },
    });
  }
}