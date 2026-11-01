import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationQueryDto } from './dto/notification-query.dto';
import {
  SafeNotificationDto,
  NotificationListResponseDto,
  UnreadCountResponseDto,
  NotificationActionResponseDto,
} from './dto/notification-response.dto';

export interface CreateNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadata?: Record<string, any> | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  // ==========================================
  // INTERNAL — CREATE NOTIFICATION
  // ==========================================

  /**
   * Create a notification for a user.
   * Failures are logged but never re-thrown to protect the calling business transaction.
   */
  async createNotification(payload: CreateNotificationPayload): Promise<void> {
    try {
      const notification = this.notificationRepository.create({
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        actionUrl: payload.actionUrl ?? null,
        metadata: payload.metadata ?? null,
        isRead: false,
        readAt: null,
      });
      await this.notificationRepository.save(notification);
      this.logger.log(
        `Notification created → [${payload.userId}] type=${payload.type}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to create notification for user [${payload.userId}]: ${err.message}`,
        err.stack,
      );
    }
  }

  // ==========================================
  // STUDENT / USER — READ NOTIFICATIONS
  // ==========================================

  async getMyNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const qb = this.notificationRepository
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.filter === 'unread') {
      qb.andWhere('n.isRead = false');
    } else if (query.filter === 'read') {
      qb.andWhere('n.isRead = true');
    }

    const [notifications, total] = await qb.getManyAndCount();

    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    return {
      data: notifications.map((n) => n.toSafeNotification() as SafeNotificationDto),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async getUnreadCount(userId: string): Promise<UnreadCountResponseDto> {
    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
    return { unreadCount };
  }

  // ==========================================
  // MARK AS READ
  // ==========================================

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationActionResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID "${notificationId}" not found or does not belong to you`,
      );
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }

    return {
      message: 'Notification marked as read',
      notification: notification.toSafeNotification() as SafeNotificationDto,
    };
  }

  async markAllAsRead(userId: string): Promise<NotificationActionResponseDto> {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('userId = :userId AND isRead = false', { userId })
      .execute();

    return { message: 'All notifications marked as read' };
  }

  async deleteNotification(
    userId: string,
    notificationId: string,
  ): Promise<NotificationActionResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID "${notificationId}" not found or does not belong to you`,
      );
    }

    await this.notificationRepository.remove(notification);
    return { message: 'Notification deleted' };
  }
}
