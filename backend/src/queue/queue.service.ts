// backend/src/queue/queue.service.ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('messages') private readonly messageQueue: Queue,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
    @InjectQueue('cleanup') private readonly cleanupQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log('Queue service initialized');
    
    // Setup queue event handlers
    this.setupQueueEvents(this.messageQueue, 'messages');
    this.setupQueueEvents(this.notificationQueue, 'notifications');
    this.setupQueueEvents(this.cleanupQueue, 'cleanup');
  }

  async onModuleDestroy() {
    await Promise.all([
      this.messageQueue.close(),
      this.notificationQueue.close(),
      this.cleanupQueue.close(),
    ]);
  }

  private setupQueueEvents(queue: Queue, name: string) {
    queue.on('completed', (job: Job) => {
      this.logger.log(`[${name}] Job ${job.id} completed`);
    });

    queue.on('failed', (job: Job, error: Error) => {
      this.logger.error(`[${name}] Job ${job.id} failed: ${error.message}`);
    });

    queue.on('stalled', (job: Job) => {
      this.logger.warn(`[${name}] Job ${job.id} stalled`);
    });
  }

  async addJob(
    queueName: 'messages' | 'notifications' | 'cleanup',
    data: any,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
      backoff?: any;
      removeOnComplete?: boolean;
      removeOnFail?: boolean;
    },
  ): Promise<Job> {
    const queue = this.getQueue(queueName);
    
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 1000,
    };

    try {
      const job = await queue.add(data, {
        ...defaultOptions,
        ...options,
      });

      this.logger.debug(`[${queueName}] Added job ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`[${queueName}] Failed to add job: ${error.message}`);
      throw error;
    }
  }

  async addBulkJobs(
    queueName: 'messages' | 'notifications' | 'cleanup',
    jobs: any[],
    options?: any,
  ): Promise<Job[]> {
    const queue = this.getQueue(queueName);

    try {
      const addedJobs = await queue.addBulk(
        jobs.map(data => ({ data, options })),
      );

      this.logger.debug(`[${queueName}] Added ${addedJobs.length} bulk jobs`);
      return addedJobs;
    } catch (error) {
      this.logger.error(`[${queueName}] Failed to add bulk jobs: ${error.message}`);
      throw error;
    }
  }

  async getJobCounts(queueName: string): Promise<any> {
    const queue = this.getQueue(queueName);
    return queue.getJobCounts();
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
  }

  async cleanQueue(queueName: string, gracePeriod?: number): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.clean(gracePeriod || 86400000, 'completed');
    await queue.clean(gracePeriod || 86400000, 'failed');
  }

  private getQueue(queueName: string): Queue {
    switch (queueName) {
      case 'messages':
        return this.messageQueue;
      case 'notifications':
        return this.notificationQueue;
      case 'cleanup':
        return this.cleanupQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }
}