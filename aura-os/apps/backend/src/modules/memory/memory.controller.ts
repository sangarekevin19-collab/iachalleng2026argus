import { Controller, Get, Post, Body, Query, UseGuards, Req, Param } from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MemoryService } from './memory.service';

@ApiTags('memory')
@Controller('memory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Post('store')
  @ApiOperation({ summary: 'Store a memory entry' })
  async store(@Req() req: any, @Body() data: Record<string, any>) {
    return this.memoryService.store({
      ...data,
      companyId: req.user.companyId,
      userId: req.user.sub,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search memory entries by content' })
  async search(@Req() req: any, @Query('q') query: string) {
    return this.memoryService.search(req.user.companyId, query);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent memory entries' })
  async getRecent(@Req() req: any, @Query('limit') limit: number = 50) {
    return this.memoryService.getRecent(req.user.companyId, limit || 50);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get memory entries by type' })
  async getByType(@Req() req: any, @Param('type') type: string) {
    return this.memoryService.getByType(req.user.companyId, type);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get memory history for current user' })
  async getHistory(@Req() req: any) {
    return this.memoryService.getHistory(req.user.companyId, req.user.sub);
  }
}
