import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MarketingService } from './services/marketing.service';
import { AiContentGeneratorService } from './services/ai-content-generator.service';
import { AiImageGeneratorService } from './services/ai-image-generator.service';
import { CreateContentDto } from './dto/create-content.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateEditorialCalendarDto } from './dto/create-editorial-calendar.dto';
import { GenerateImageDto } from './dto/generate-image.dto';

@ApiTags('Marketing IA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('marketing')
export class MarketingController {
  constructor(
    private readonly marketingService: MarketingService,
    private readonly aiContentGenerator: AiContentGeneratorService,
    private readonly aiImageGenerator: AiImageGeneratorService,
  ) {}

  @Post('content/generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate AI content for social media' })
  async generateContent(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateContentDto,
  ) {
    return this.marketingService.createContent(dto, companyId);
  }

  @Post('content/generate-image')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate AI marketing image' })
  async generateImage(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: GenerateImageDto,
  ) {
    const companyProfile = { companyId };
    return this.aiImageGenerator.generateImage(dto, companyProfile);
  }

  @Post('content/generate-ideas')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Get AI-generated post ideas' })
  async generateIdeas(
    @CurrentUser('companyId') companyId: string,
    @Body() body: { count?: number },
  ) {
    const companyProfile = { companyId };
    const ideas = await this.aiContentGenerator.generatePostIdeas(companyProfile, body.count || 5);
    return { ideas };
  }

  @Post('content/generate-calendar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate AI editorial calendar' })
  async generateCalendar(
    @CurrentUser('companyId') companyId: string,
    @Body() body: { month?: number; year?: number; themes?: string[] },
  ) {
    const now = new Date();
    const month = body.month || now.getMonth() + 1;
    const year = body.year || now.getFullYear();
    const themes = body.themes || [];

    const calendar = await this.aiContentGenerator.generateEditorialCalendar(companyId, month, year, themes);
    return calendar;
  }

  @Post('content/generate-hashtags')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate AI hashtags' })
  async generateHashtags(
    @CurrentUser('companyId') companyId: string,
    @Body() body: { content: string; platform?: string; count?: number },
  ) {
    const hashtags = await this.aiContentGenerator.generateHashtags(
      body.content,
      body.platform || 'instagram',
      body.count || 10,
    );
    return { hashtags };
  }

  @Post('content/translate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Translate marketing content' })
  async translateContent(
    @CurrentUser('companyId') companyId: string,
    @Body() body: { content: string; targetLanguage: string },
  ) {
    const translated = await this.aiContentGenerator.translateContent(body.content, body.targetLanguage);
    return { original: body.content, translated, targetLanguage: body.targetLanguage };
  }

  @Post('content/generate-ad-copy')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate AI ad copy' })
  async generateAdCopy(
    @CurrentUser('companyId') companyId: string,
    @Body() body: { product: any; platform: string; objective: string },
  ) {
    const adCopy = await this.aiContentGenerator.generateAdCopy(body.product, body.platform, body.objective);
    return { adCopy };
  }

  @Get('content')
  @ApiOperation({ summary: 'List marketing content' })
  async getContent(
    @CurrentUser('companyId') companyId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('platform') platform?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.marketingService.getContent(companyId, { type, status, platform, page, limit });
  }

  @Get('content/:id')
  @ApiOperation({ summary: 'Get content detail' })
  async getContentById(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.marketingService.getContentById(id, companyId);
  }

  @Put('content/:id')
  @ApiOperation({ summary: 'Update content' })
  async updateContent(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: Partial<CreateContentDto>,
  ) {
    return this.marketingService.updateContent(id, companyId, dto);
  }

  @Delete('content/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete content' })
  async deleteContent(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    await this.marketingService.deleteContent(id, companyId);
  }

  @Post('content/:id/schedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Schedule content' })
  async scheduleContent(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body: { scheduledAt: string },
  ) {
    return this.marketingService.scheduleContent(id, companyId, new Date(body.scheduledAt));
  }

  @Post('content/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish content now' })
  async publishContent(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.marketingService.publishContent(id, companyId);
  }

  @Post('campaigns')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create marketing campaign' })
  async createCampaign(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.marketingService.createCampaign(dto, companyId);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'List campaigns' })
  async getCampaigns(
    @CurrentUser('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('objective') objective?: string,
  ) {
    return this.marketingService.getCampaigns(companyId, { status, objective });
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Campaign detail' })
  async getCampaignById(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.marketingService.getCampaignById(id, companyId);
  }

  @Put('campaigns/:id')
  @ApiOperation({ summary: 'Update campaign' })
  async updateCampaign(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: Partial<CreateCampaignDto>,
  ) {
    return this.marketingService.updateCampaign(id, companyId, dto);
  }

  @Post('campaigns/:id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause campaign' })
  async pauseCampaign(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.marketingService.pauseCampaign(id, companyId);
  }

  @Post('campaigns/:id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume campaign' })
  async resumeCampaign(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.marketingService.resumeCampaign(id, companyId);
  }

  @Get('editorial-calendars')
  @ApiOperation({ summary: 'List editorial calendars' })
  async getEditorialCalendars(
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.marketingService.getEditorialCalendars(companyId);
  }

  @Post('editorial-calendars')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create editorial calendar' })
  async createEditorialCalendar(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateEditorialCalendarDto,
  ) {
    return this.marketingService.createEditorialCalendar(dto, companyId);
  }

  @Get('editorial-calendars/:month/:year')
  @ApiOperation({ summary: 'Get calendar for specific month' })
  async getCalendarForMonth(
    @Param('month') month: number,
    @Param('year') year: number,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.marketingService.getCalendarForMonth(companyId, month, year);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Marketing statistics' })
  async getMarketingStats(
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.marketingService.getMarketingStats(companyId);
  }

  @Get('best-content')
  @ApiOperation({ summary: 'Best performing content' })
  async getBestPerformingContent(
    @CurrentUser('companyId') companyId: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.marketingService.getBestPerformingContent(companyId, limit);
  }

  @Post('auto-generate-monthly')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Auto-generate monthly content' })
  async autoGenerateMonthly(
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.marketingService.autoGenerateMonthlyContent(companyId);
  }

  @Post('images/product')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate product image' })
  async generateProductImage(
    @CurrentUser('companyId') companyId: string,
    @Body() body: { product: any; style?: string },
  ) {
    return this.aiImageGenerator.generateProductImage(body.product, body.style || 'vibrant');
  }

  @Post('images/banner')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate promotional banner' })
  async generatePromotionalBanner(
    @CurrentUser('companyId') companyId: string,
    @Body() body: { product: any; offer: string; dimensions?: string },
  ) {
    return this.aiImageGenerator.generatePromotionalBanner(body.product, body.offer, body.dimensions || 'landscape');
  }

  @Post('images/social-kit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate social media branding kit' })
  async generateSocialMediaKit(
    @CurrentUser('companyId') companyId: string,
    @Body() body: { companyProfile: any },
  ) {
    return this.aiImageGenerator.generateSocialMediaKit(body.companyProfile);
  }

  @Post('images/flyer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate event flyer' })
  async generateFlyer(
    @CurrentUser('companyId') companyId: string,
    @Body() body: { event: string; details: string; companyProfile?: any },
  ) {
    return this.aiImageGenerator.generateFlyer(body.companyProfile || { companyId }, body.event, body.details);
  }
}
