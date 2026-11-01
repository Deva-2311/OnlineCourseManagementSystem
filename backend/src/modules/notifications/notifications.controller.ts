import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import {
  NotificationListResponseDto,
  UnreadCountResponseDto,
  NotificationActionResponseDto,
} from './dto/notification-response.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // GET /notifications/me
  @Get('me')
  @ApiOperation({ summary: 'Get current user notifications (paginated)' })
  @ApiResponse({ status: 200, type: NotificationListResponseDto })
  async getMyNotifications(
    @CurrentUser() user: User,
    @Query() query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    return this.notificationsService.getMyNotifications(user.id, query);
  }

  // GET /notifications/me/unread-count
  @Get('me/unread-count')
  @ApiOperation({ summary: 'Get unread notification count for the current user' })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  async getUnreadCount(@CurrentUser() user: User): Promise<UnreadCountResponseDto> {
    return this.notificationsService.getUnreadCount(user.id);
  }

  // PATCH /notifications/me/read-all
  @Patch('me/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, type: NotificationActionResponseDto })
  async markAllAsRead(@CurrentUser() user: User): Promise<NotificationActionResponseDto> {
    return this.notificationsService.markAllAsRead(user.id);
  }

  // PATCH /notifications/:id/read
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: NotificationActionResponseDto })
  async markAsRead(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationActionResponseDto> {
    return this.notificationsService.markAsRead(user.id, id);
  }

  // DELETE /notifications/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: NotificationActionResponseDto })
  async deleteNotification(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationActionResponseDto> {
    return this.notificationsService.deleteNotification(user.id, id);
  }
}
