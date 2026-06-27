import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingContent, ContentStatus, ContentPlatform } from '../entities/marketing-content.entity';
import { EditorialCalendar, CalendarStatus } from '../entities/editorial-calendar.entity';
import { MarketingCampaign, CampaignStatus } from '../entities/marketing-campaign.entity';
import { CreateContentDto } from '../dto/create-content.dto';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { CreateEditorialCalendarDto } from '../dto/create-editorial-calendar.dto';
import { AiContentGeneratorService } from './ai-content-generator.service';
import { AiImageGeneratorService } from './ai-image-generator.service';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    @InjectRepository(MarketingContent)
    private contentRepository: Repository<MarketingContent>,
    @InjectRepository(EditorialCalendar)
    private calendarRepository: Repository<EditorialCalendar>,
    @InjectRepository(MarketingCampaign)
    private campaignRepository: Repository<MarketingCampaign>,
    private readonly aiContentGenerator: AiContentGeneratorService,
    private readonly aiImageGenerator: AiImageGeneratorService,
  ) {}

  async createContent(dto: CreateContentDto, companyId: string): Promise<MarketingContent> {
    const generatedContent = await this.aiContentGenerator.generateSocialPost(dto, { companyId });

    const content = this.contentRepository.create({
      companyId,
      type: dto.type,
      title: dto.title || `Post - ${dto.topic}`,
      description: dto.description,
      content: {
        text: generatedContent.text,
        hashtags: generatedContent.hashtags,
        platform: dto.platform,
        tone: dto.tone,
        callToAction: generatedContent.callToAction,
        suggestedImagePrompt: generatedContent.suggestedImagePrompt,
      },
      platform: dto.platform || ContentPlatform.ALL,
      status: dto.scheduledAt ? ContentStatus.SCHEDULED : ContentStatus.DRAFT,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      aiPrompt: generatedContent.suggestedImagePrompt,
      createdBy: 'ai',
    });

    return this.contentRepository.save(content);
  }

  async getContent(
    companyId: string,
    filters?: { type?: string; status?: string; platform?: string; page?: number; limit?: number },
  ): Promise<{ data: MarketingContent[]; total: number; page: number; limit: number }> {
    const where: any = { companyId };

    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.platform) where.platform = filters.platform;

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.contentRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getContentById(id: string, companyId: string): Promise<MarketingContent> {
    const content = await this.contentRepository.findOne({ where: { id, companyId } });
    if (!content) {
      throw new NotFoundException('Content not found');
    }
    return content;
  }

  async updateContent(id: string, companyId: string, dto: Partial<CreateContentDto>): Promise<MarketingContent> {
    const content = await this.getContentById(id, companyId);

    if (dto.title) content.title = dto.title;
    if (dto.description) content.description = dto.description;
    if (dto.platform) content.platform = dto.platform as any;

    if (dto.topic || dto.tone) {
      const generatedContent = await this.aiContentGenerator.generateSocialPost(
        { ...dto, type: content.type } as CreateContentDto,
        { companyId },
      );
      content.content = {
        ...content.content,
        text: generatedContent.text,
        hashtags: generatedContent.hashtags,
        callToAction: generatedContent.callToAction,
        suggestedImagePrompt: generatedContent.suggestedImagePrompt,
      };
      content.aiPrompt = generatedContent.suggestedImagePrompt;
    }

    return this.contentRepository.save(content);
  }

  async deleteContent(id: string, companyId: string): Promise<void> {
    const content = await this.getContentById(id, companyId);
    await this.contentRepository.remove(content);
  }

  async scheduleContent(id: string, companyId: string, scheduledAt: Date): Promise<MarketingContent> {
    const content = await this.getContentById(id, companyId);
    content.scheduledAt = scheduledAt;
    content.status = ContentStatus.SCHEDULED;
    return this.contentRepository.save(content);
  }

  async publishContent(id: string, companyId: string): Promise<MarketingContent> {
    const content = await this.getContentById(id, companyId);
    content.status = ContentStatus.PUBLISHED;
    content.publishedAt = new Date();
    return this.contentRepository.save(content);
  }

  async createCampaign(dto: CreateCampaignDto, companyId: string): Promise<MarketingCampaign> {
    const generatedCampaign = await this.aiContentGenerator.generateCampaign(dto, { companyId });

    const campaign = this.campaignRepository.create({
      companyId,
      name: dto.name,
      description: dto.description || generatedCampaign.description,
      objective: dto.objective,
      targetAudience: dto.targetAudience || generatedCampaign.targetAudience,
      platforms: dto.platforms,
      budget: dto.budget,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      contentIds: [],
      status: CampaignStatus.DRAFT,
      stats: {
        impressions: 0,
        reach: 0,
        engagement: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
      },
    });

    const savedCampaign = await this.campaignRepository.save(campaign);

    const contentIds: string[] = [];
    for (const post of generatedCampaign.posts) {
      const content = await this.contentRepository.save(
        this.contentRepository.create({
          companyId,
          type: 'post' as any,
          title: post.title || `${dto.name} - Post`,
          description: post.text,
          content: {
            text: post.text,
            platform: post.platform,
            type: post.type,
          },
          platform: (post.platform as any) || ContentPlatform.ALL,
          status: ContentStatus.DRAFT,
          createdBy: 'ai',
        }),
      );
      contentIds.push(content.id);
    }

    savedCampaign.contentIds = contentIds;
    return this.campaignRepository.save(savedCampaign);
  }

  async getCampaigns(
    companyId: string,
    filters?: { status?: string; objective?: string },
  ): Promise<MarketingCampaign[]> {
    const where: any = { companyId };
    if (filters?.status) where.status = filters.status;
    if (filters?.objective) where.objective = filters.objective;

    return this.campaignRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async getCampaignById(id: string, companyId: string): Promise<MarketingCampaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id, companyId } });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }

  async updateCampaign(id: string, companyId: string, dto: Partial<CreateCampaignDto>): Promise<MarketingCampaign> {
    const campaign = await this.getCampaignById(id, companyId);

    if (dto.name) campaign.name = dto.name;
    if (dto.description) campaign.description = dto.description;
    if (dto.objective) campaign.objective = dto.objective;
    if (dto.targetAudience) campaign.targetAudience = dto.targetAudience;
    if (dto.platforms) campaign.platforms = dto.platforms;
    if (dto.budget !== undefined) campaign.budget = dto.budget;
    if (dto.startDate) campaign.startDate = new Date(dto.startDate);
    if (dto.endDate) campaign.endDate = new Date(dto.endDate);

    return this.campaignRepository.save(campaign);
  }

  async updateCampaignStats(id: string, companyId: string, stats: Partial<MarketingCampaign['stats']>): Promise<void> {
    await this.campaignRepository.update(
      { id, companyId },
      { stats: () => `stats || '${JSON.stringify(stats)}'::jsonb` },
    );
  }

  async pauseCampaign(id: string, companyId: string): Promise<MarketingCampaign> {
    const campaign = await this.getCampaignById(id, companyId);
    campaign.status = CampaignStatus.PAUSED;
    return this.campaignRepository.save(campaign);
  }

  async resumeCampaign(id: string, companyId: string): Promise<MarketingCampaign> {
    const campaign = await this.getCampaignById(id, companyId);
    campaign.status = CampaignStatus.RUNNING;
    return this.campaignRepository.save(campaign);
  }

  async createEditorialCalendar(dto: CreateEditorialCalendarDto, companyId: string): Promise<EditorialCalendar> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const month = startDate.getMonth() + 1;
    const year = startDate.getFullYear();

    const themes = dto.items?.map(i => i.notes).filter(Boolean) || [];
    const generatedCalendar = await this.aiContentGenerator.generateEditorialCalendar(companyId, month, year, themes);

    const calendar = this.calendarRepository.create({
      companyId,
      title: dto.title || generatedCalendar.title,
      description: dto.description,
      startDate,
      endDate,
      items: dto.items || generatedCalendar.items,
      status: CalendarStatus.DRAFT,
    });

    return this.calendarRepository.save(calendar);
  }

  async getEditorialCalendars(companyId: string): Promise<EditorialCalendar[]> {
    return this.calendarRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async getCalendarForMonth(companyId: string, month: number, year: number): Promise<EditorialCalendar | null> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return this.calendarRepository.findOne({
      where: {
        companyId,
        startDate: startDate,
        endDate: endDate,
      },
    });
  }

  async getMarketingStats(companyId: string): Promise<{
    totalContent: number;
    published: number;
    scheduled: number;
    draft: number;
    topPlatform: string;
    engagement: { likes: number; shares: number; comments: number; reach: number; clicks: number };
    totalCampaigns: number;
    activeCampaigns: number;
  }> {
    const contents = await this.contentRepository.find({ where: { companyId } });
    const campaigns = await this.campaignRepository.find({ where: { companyId } });

    const published = contents.filter(c => c.status === ContentStatus.PUBLISHED).length;
    const scheduled = contents.filter(c => c.status === ContentStatus.SCHEDULED).length;
    const draft = contents.filter(c => c.status === ContentStatus.DRAFT).length;

    const platformCounts: Record<string, number> = {};
    contents.forEach(c => {
      platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
    });
    const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const engagement = contents.reduce(
      (acc, c) => ({
        likes: acc.likes + (c.engagement?.likes || 0),
        shares: acc.shares + (c.engagement?.shares || 0),
        comments: acc.comments + (c.engagement?.comments || 0),
        reach: acc.reach + (c.engagement?.reach || 0),
        clicks: acc.clicks + (c.engagement?.clicks || 0),
      }),
      { likes: 0, shares: 0, comments: 0, reach: 0, clicks: 0 },
    );

    const activeCampaigns = campaigns.filter(c => c.status === CampaignStatus.RUNNING).length;

    return {
      totalContent: contents.length,
      published,
      scheduled,
      draft,
      topPlatform,
      engagement,
      totalCampaigns: campaigns.length,
      activeCampaigns,
    };
  }

  async getBestPerformingContent(companyId: string, limit: number = 10): Promise<MarketingContent[]> {
    const contents = await this.contentRepository.find({
      where: { companyId, status: ContentStatus.PUBLISHED },
    });

    return contents
      .sort((a, b) => {
        const scoreA = (a.engagement?.likes || 0) + (a.engagement?.shares || 0) * 2 + (a.engagement?.comments || 0) * 3;
        const scoreB = (b.engagement?.likes || 0) + (b.engagement?.shares || 0) * 2 + (b.engagement?.comments || 0) * 3;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  async autoGenerateMonthlyContent(companyId: string): Promise<EditorialCalendar> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const existingCalendar = await this.getCalendarForMonth(companyId, month, year);
    if (existingCalendar) {
      return existingCalendar;
    }

    const themes = ['Produits phares', 'Conseils pratiques', 'Témoignages clients', 'Promotions', 'Culture locale'];
    const generatedCalendar = await this.aiContentGenerator.generateEditorialCalendar(companyId, month, year, themes);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const calendar = this.calendarRepository.create({
      companyId,
      title: generatedCalendar.title,
      description: 'Calendrier éditorial généré automatiquement par IA',
      startDate,
      endDate,
      items: generatedCalendar.items,
      status: CalendarStatus.ACTIVE,
    });

    const savedCalendar = await this.calendarRepository.save(calendar);

    for (const item of generatedCalendar.items) {
      await this.contentRepository.save(
        this.contentRepository.create({
          companyId,
          type: 'post' as any,
          title: item.title || `Post - ${item.type}`,
          description: item.notes,
          content: {
            text: `Contenu généré pour ${item.type}`,
            platform: item.platform,
            type: item.type,
          },
          platform: (item.platform as any) || ContentPlatform.ALL,
          status: ContentStatus.SCHEDULED,
          scheduledAt: item.date ? new Date(item.date) : null,
          createdBy: 'ai',
        }),
      );
    }

    return savedCalendar;
  }

  async generatePostIdeas(companyProfile: any, count: number = 5): Promise<string[]> {
    return this.aiContentGenerator.generatePostIdeas(companyProfile, count);
  }

  async generateHashtags(content: string, platform: string, count: number = 10): Promise<string[]> {
    return this.aiContentGenerator.generateHashtags(content, platform, count);
  }

  async translateContent(content: string, targetLanguage: string): Promise<string> {
    return this.aiContentGenerator.translateContent(content, targetLanguage);
  }

  async generateAdCopy(product: any, platform: string, objective: string): Promise<string> {
    return this.aiContentGenerator.generateAdCopy(product, platform, objective);
  }
}
