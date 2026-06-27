import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings for the company' })
  async getAll(@Req() req: any) {
    return this.settingsService.getAll(req.user.companyId);
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get settings by category' })
  async getByCategory(@Req() req: any, @Param('category') category: string) {
    return this.settingsService.getByCategory(req.user.companyId, category);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a specific setting by key' })
  async get(@Req() req: any, @Param('key') key: string) {
    return this.settingsService.get(req.user.companyId, key);
  }

  @Post(':key')
  @ApiOperation({ summary: 'Set a setting value' })
  async set(
    @Req() req: any,
    @Param('key') key: string,
    @Body() dto: { value: Record<string, any>; category?: string },
  ) {
    return this.settingsService.set(req.user.companyId, key, dto.value, dto.category);
  }
}
