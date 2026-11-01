/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notifRepo: any;

  const userId = 'user-uuid-1';
  const notifId = 'notif-uuid-1';

  const makeNotification = (overrides?: Partial<Notification>): Notification =>
    ({
      id: notifId,
      userId,
      type: NotificationType.ENROLLMENT_CONFIRMED,
      title: 'Enrolled!',
      message: 'You are now enrolled.',
      actionUrl: '/student/courses',
      metadata: null,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      toSafeNotification() {
        return {
          id: this.id,
          userId: this.userId,
          type: this.type,
          title: this.title,
          message: this.message,
          actionUrl: this.actionUrl,
          metadata: this.metadata,
          isRead: this.isRead,
          readAt: this.readAt,
          createdAt: this.createdAt,
          updatedAt: this.updatedAt,
        };
      },
      ...overrides,
    } as any);

  beforeEach(async () => {
    notifRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: notifRepo },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  // ─────────────────────────────────────────────────────────────────
  // createNotification
  // ─────────────────────────────────────────────────────────────────

  describe('createNotification()', () => {
    it('creates and saves a notification', async () => {
      const notif = makeNotification();
      notifRepo.create.mockReturnValue(notif);
      notifRepo.save.mockResolvedValue(notif);

      await service.createNotification({
        userId,
        type: NotificationType.ENROLLMENT_CONFIRMED,
        title: 'Enrolled!',
        message: 'You are now enrolled.',
        actionUrl: '/student/courses',
      });

      expect(notifRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId, isRead: false }),
      );
      expect(notifRepo.save).toHaveBeenCalled();
    });

    it('does NOT throw if save fails — it only logs', async () => {
      notifRepo.create.mockReturnValue({});
      notifRepo.save.mockRejectedValue(new Error('DB error'));

      // Should resolve without throwing
      await expect(
        service.createNotification({
          userId,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          title: 'Test',
          message: 'Test msg',
        }),
      ).resolves.toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // getUnreadCount
  // ─────────────────────────────────────────────────────────────────

  describe('getUnreadCount()', () => {
    it('returns the unread count from repository', async () => {
      notifRepo.count.mockResolvedValue(5);
      const result = await service.getUnreadCount(userId);
      expect(result).toEqual({ unreadCount: 5 });
      expect(notifRepo.count).toHaveBeenCalledWith({ where: { userId, isRead: false } });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // markAsRead
  // ─────────────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    it('marks an unread notification as read and returns it', async () => {
      const notif = makeNotification({ isRead: false });
      notifRepo.findOne.mockResolvedValue(notif);
      notifRepo.save.mockResolvedValue({ ...notif, isRead: true, readAt: new Date() });

      const result = await service.markAsRead(userId, notifId);

      expect(notifRepo.save).toHaveBeenCalled();
      expect(result.message).toBe('Notification marked as read');
      // The entity isRead is mutated to true before toSafeNotification() is called
      expect(result.notification?.isRead).toBe(true);
    });

    it('does NOT save if the notification is already read', async () => {
      const notif = makeNotification({ isRead: true });
      notifRepo.findOne.mockResolvedValue(notif);

      await service.markAsRead(userId, notifId);

      expect(notifRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when notification not found', async () => {
      notifRepo.findOne.mockResolvedValue(null);

      await expect(service.markAsRead(userId, notifId)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for notification owned by another user', async () => {
      notifRepo.findOne.mockResolvedValue(null); // TypeORM where: { id, userId } returns null

      await expect(service.markAsRead('other-user', notifId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // markAllAsRead
  // ─────────────────────────────────────────────────────────────────

  describe('markAllAsRead()', () => {
    it('executes bulk update query and returns success message', async () => {
      const mockQb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      notifRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.markAllAsRead(userId);

      expect(mockQb.execute).toHaveBeenCalled();
      expect(result.message).toBe('All notifications marked as read');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // deleteNotification
  // ─────────────────────────────────────────────────────────────────

  describe('deleteNotification()', () => {
    it('removes the notification and returns success message', async () => {
      const notif = makeNotification();
      notifRepo.findOne.mockResolvedValue(notif);
      notifRepo.remove.mockResolvedValue(notif);

      const result = await service.deleteNotification(userId, notifId);

      expect(notifRepo.remove).toHaveBeenCalledWith(notif);
      expect(result.message).toBe('Notification deleted');
    });

    it('throws NotFoundException when notification not found or belongs to another user', async () => {
      notifRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteNotification(userId, notifId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // getMyNotifications
  // ─────────────────────────────────────────────────────────────────

  describe('getMyNotifications()', () => {
    it('returns paginated notifications with metadata', async () => {
      const notifications = [makeNotification(), makeNotification({ id: 'notif-uuid-2' })];
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([notifications, 2]),
      };
      notifRepo.createQueryBuilder.mockReturnValue(mockQb);
      notifRepo.count.mockResolvedValue(1);

      const result = await service.getMyNotifications(userId, { page: '1', limit: '20' });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.unreadCount).toBe(1);
    });

    it('applies the "unread" filter via andWhere', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      notifRepo.createQueryBuilder.mockReturnValue(mockQb);
      notifRepo.count.mockResolvedValue(0);

      await service.getMyNotifications(userId, { filter: 'unread' });

      expect(mockQb.andWhere).toHaveBeenCalledWith('n.isRead = false');
    });
  });
});
