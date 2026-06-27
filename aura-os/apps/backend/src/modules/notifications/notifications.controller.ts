import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  async getByUser(@Req() req: any, @Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.notificationsService.getByUser(req.user.sub, page || 1, limit || 20);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications' })
  async getUnread(@Req() req: any) {
    return this.notificationsService.getUnread(req.user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@Req() req: any) {
    return this.notificationsService.markAllRead(req.user.sub);
  }
}
