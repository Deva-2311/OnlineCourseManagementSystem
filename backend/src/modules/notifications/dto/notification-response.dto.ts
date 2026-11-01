import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-type.enum';

export class SafeNotificationDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: NotificationType }) type: NotificationType;
  @ApiProperty() title: string;
  @ApiProperty() message: string;
  @ApiPropertyOptional() actionUrl?: string | null;
  @ApiPropertyOptional() metadata?: Record<string, any> | null;
  @ApiProperty() isRead: boolean;
  @ApiPropertyOptional() readAt?: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [SafeNotificationDto] }) data: SafeNotificationDto[];
  @ApiProperty() meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  };
}

export class UnreadCountResponseDto {
  @ApiProperty() unreadCount: number;
}

export class NotificationActionResponseDto {
  @ApiProperty() message: string;
  @ApiPropertyOptional({ type: SafeNotificationDto }) notification?: SafeNotificationDto;
}
