import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LlmService } from '../modules/agents/services/llm.service';
import { MemoryService } from '../modules/memory/memory.service';

export interface SocialPost {
  id: string;
  platform: string;
  content: string;
  mediaUrls: string[];
  hashtags: string[];
  scheduledAt: Date;
  status: string;
  engagement?: { likes: number; comments: number; shares: number; reach: number };
}

export interface ContentPlan {
  week: number;
  year: number;
  posts: SocialPost[];
  theme: string;
}

@Injectable()
export class SocialMediaService {
  private readonly logger = new Logger('SocialMedia');

  constructor(
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
  ) {}

  async generateContentPlan(companyProfile: any, platforms: string[], weekCount: number = 4): Promise<ContentPlan[]> {
    const plans: ContentPlan[] = [];

    const profileStr = JSON.stringify({
      name: companyProfile.name || 'Entreprise',
      sector: companyProfile.sector || 'General',
      description: companyProfile.description || '',
      targetClients: companyProfile.targetClients || 'Clients locaux',
      country: companyProfile.country || 'Afrique de l Ouest',
    }, null, 2);

    const systemPrompt = 'Tu es un expert en marketing digital pour les PME africaines. Genere un plan de contenu social media engageant.\n\nPROFIL ENTREPRISE:\n' + profileStr + '\n\nPLATEFORMES: ' + platforms.join(', ') + '\n\nGenere un plan de contenu pour ' + weekCount + ' semaines. Pour chaque semaine: 3-5 posts par plateforme, contenu adapte, hashtags pertinents, hooks accrocheurs, CTA clairs. Ton: professionnel mais accessible, fierte africaine, valeur ajoutee.\n\nReponds UNIQUEMENT en JSON: {plans:[{week:N,theme:"theme",posts:[{platform:"facebook",content:"...",hashtags:["#tag"],bestTime:"18:00",type:"educational"}]}]}';

    try {
      const response = await this.llmService.generateResponse(systemPrompt, [
        { role: 'user', content: 'Genere le plan de contenu pour ' + weekCount + ' semaines.' },
      ]);

      let jsonStr = response.replace(/```json/gi, '').replace(/```/g, '');
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start >= 0 && end > start) {
        jsonStr = jsonStr.substring(start, end + 1);
        const parsed = JSON.parse(jsonStr);

        const now = new Date();
        for (const plan of (parsed.plans || [])) {
          const posts: SocialPost[] = (plan.posts || []).map((p: any) => ({
            id: 'post-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            platform: p.platform || 'facebook',
            content: p.content || '',
            mediaUrls: [],
            hashtags: p.hashtags || [],
            scheduledAt: this.calculatePostTime(plan.week, p.bestTime),
            status: 'draft' as any,
          }));

          plans.push({ week: plan.week || 1, year: now.getFullYear(), posts, theme: plan.theme || '' });
        }
      }
    } catch (error: any) {
      this.logger.error('Content plan generation failed: ' + error.message);
    }

    return plans;
  }

  async generatePost(companyProfile: any, platform: string, type: string, topic?: string): Promise<SocialPost> {
    const guidelines: Record<string, string> = {
      facebook: 'Ton conversationnel, 2-3 paragraphes max, emojis moderes, CTA clair',
      Instagram: 'Visuel first, caption courte et percutante, 15-20 hashtags, emojis',
      LinkedIn: 'Ton professionnel, storytelling, 1-2 paragraphes, 3-5 hashtags',
      Tiktok: 'Hook dans les 3 premieres secondes, tendance, jeune et dynamique',
      Twitter: 'Concis (280 chars), percutant, 1-2 hashtags',
    };

    const systemPrompt = 'Tu es un expert en creation de contenu social media pour une entreprise africaine.\n\nPROFIL:\n- Secteur: ' + (companyProfile.sector || 'General') + '\n- Nom: ' + (companyProfile.name || 'Entreprise') + '\n- Cible: ' + (companyProfile.targetClients || 'Clients locaux') + '\n\nPLATEFORME: ' + platform + '\nGUIDELINES: ' + (guidelines[platform] || 'Ton professionnel et engageant') + '\nTYPE: ' + type + '\n' + (topic ? 'SUJET: ' + topic : '') + '\n\nGenere UN post parfaitement adapte. Reponds en JSON: {content,hashtags,bestTime,hook,cta}';

    try {
      const response = await this.llmService.generateResponse(systemPrompt, [
        { role: 'user', content: 'Genere le post.' },
      ]);

      let jsonStr = response.replace(/```json/gi, '').replace(/```/g, '');
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start >= 0 && end > start) {
        jsonStr = jsonStr.substring(start, end + 1);
        const parsed = JSON.parse(jsonStr);

        return {
          id: 'post-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          platform: platform as any,
          content: parsed.content || '',
          mediaUrls: [],
          hashtags: parsed.hashtags || [],
          scheduledAt: new Date(),
          status: 'draft',
        };
      }
    } catch (error: any) {
      this.logger.error('Post generation failed: ' + error.message);
    }

    return {
      id: 'post-' + Date.now(),
      platform: platform as any,
      content: 'Decouvrez nos nouveaux produits et services ! Contactez-nous pour en savoir plus.',
      mediaUrls: [],
      hashtags: ['#business', '#africa'],
      scheduledAt: new Date(),
      status: 'draft',
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async autoPublish(): Promise<void> {
    this.logger.log('Social Media - Checking scheduled posts...');
  }

  async analyzePerformance(companyId: string, platform?: string): Promise<any> {
    return {
      totalPosts: 0,
      totalEngagement: 0,
      bestPerformingType: 'educational',
      bestTime: '18:00',
      recommendations: [
        'Postez plus de contenu educatif',
        'Les videos performent 3x mieux',
        'Le meilleur moment est 18h-20h',
      ],
    };
  }

  private calculatePostTime(week: number, bestTime: string): Date {
    const now = new Date();
    const targetWeek = new Date(now.getTime() + (week - 1) * 7 * 86400000);
    const parts = (bestTime || '18:00').split(':');
    const hours = parseInt(parts[0] || '18', 10);
    const minutes = parseInt(parts[1] || '0', 10);
    targetWeek.setHours(hours, minutes, 0, 0);
    return targetWeek;
  }
}
