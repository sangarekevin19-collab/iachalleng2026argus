import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateContentDto } from '../dto/create-content.dto';

@Injectable()
export class AiContentGeneratorService {
  private readonly logger = new Logger(AiContentGeneratorService.name);
  private readonly openaiApiKey: string;
  private readonly openaiModel: string;

  constructor(private readonly configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY', '');
    this.openaiModel = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o');
  }

  async generateSocialPost(dto: CreateContentDto, companyProfile: any): Promise<{
    text: string;
    hashtags: string[];
    callToAction: string;
    suggestedImagePrompt: string;
  }> {
    const language = dto.language || 'fr';
    const platform = dto.platform || 'all';
    const tone = dto.tone || 'professional';

    const languageInstructions: Record<string, string> = {
      fr: 'Écris en français avec des expressions naturelles utilisées en Afrique de l\'Ouest',
      en: 'Write in English with a tone relevant to African audiences',
      mooré: 'Écris en Mooré avec des expressions culturelles appropriées',
      dioula: 'Écris en Dioula avec des expressions culturelles appropriées',
    };

    const platformLimits: Record<string, string> = {
      instagram: '280 caractères max, utilise des emojis',
      twitter: '280 caractères max',
      facebook: '500 caractères max, ton engageant',
      linkedin: 'Ton professionnel, 300 caractères',
      tiktok: '150 caractères, ton jeune et dynamique',
      whatshell: '150 caractères, ton conversationnel',
      all: '250 caractères, ton adaptable',
    };

    const systemPrompt = `Tu est un expert en marketing digital spécialisé dans les marchés africains de l'Ouest.
Tu crées du contenu engageant pour les réseaux sociaux qui résonne avec le public africain.
${languageInstructions[language] || languageInstructions.fr}
Le ton doit être: ${tone}
Format pour la plateforme: ${platformLimits[platform] || platformLimits.all}

Prends en compte:
- Les réalités culturelles africaines
- Les événements et fêtes locales (Tabaski, Ramadan, fête de l'indépendance, etc.)
- Le langage courant et les expressions locales
- L'humour et les références culturelles africaines

Réponds UNIQUEMENT en JSON avec: {"text":"...","hashtags":["..."],"callToAction":"...","suggestedImagePrompt":"..."}`;

    const userPrompt = `Crée un post ${platform} sur le thème: "${dto.topic}"
Entreprise: ${companyProfile?.name || 'Entreprise africaine'}
Secteur: ${companyProfile?.sector || 'Commerce général'}
Public cible: ${dto.targetAudience || 'Jeunes adultes africains 18-40 ans'}
Appel à l'action souhaité: ${dto.callToAction || 'Découvrez nos offres'}
${dto.hashtags?.length ? `Hashtags à inclure: ${dto.hashtags.join(', ')}` : ''}`;

    if (!this.openaiApiKey) {
      return this.generatePlaceholderPost(dto, companyProfile);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: this.openaiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        this.logger.error(`OpenAI API error: ${response.status}`);
        return this.generatePlaceholderPost(dto, companyProfile);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      try {
        return JSON.parse(content);
      } catch {
        return this.generatePlaceholderPost(dto, companyProfile);
      }
    } catch (error) {
      this.logger.error(`Error generating social post: ${error.message}`);
      return this.generatePlaceholderPost(dto, companyProfile);
    }
  }

  async generatePostIdeas(companyProfile: any, count: number = 5): Promise<string[]> {
    const sector = companyProfile?.sector || 'Commerce général';
    const country = companyProfile?.country || 'Burkina Faso';

    const systemPrompt = `Tu es un expert en marketing de contenu pour les marchés africains.
Tu génères des idées de posts créatifs et engageants pour les entreprises en Afrique de l'Ouest.

Types de posts à proposer:
- Produits/Services (mise en avant)
- Éducatifs (conseils, astuces)
- Témoignages clients
- Promotions/Offres
- Culturels (fêtes, événements africains)
- Behind the scenes (coulisses)
- User generated content
- Questions/Engagement

Réponds UNIQUEMENT en JSON: ["idée1","idée2",...]`;

    const userPrompt = `Génère ${count} idées de posts pour:
Secteur: ${sector}
Pays: ${country}
Entreprise: ${companyProfile?.name || 'Entreprise locale'}

Les idées doivent être:
- Pertinents pour le public africain
- En français (avec éventuellement des expressions locales)
- Variés dans le type de contenu
- Actionnables et engageants`;

    if (!this.openaiApiKey) {
      return this.generatePlaceholderIdeas(companyProfile, count);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: this.openaiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.9,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        return this.generatePlaceholderIdeas(companyProfile, count);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      try {
        return JSON.parse(content);
      } catch {
        return this.generatePlaceholderIdeas(companyProfile, count);
      }
    } catch (error) {
      this.logger.error(`Error generating post ideas: ${error.message}`);
      return this.generatePlaceholderIdeas(companyProfile, count);
    }
  }

  async generateCampaign(dto: any, companyProfile: any): Promise<{
    name: string;
    description: string;
    posts: any[];
    schedule: any[];
    targetAudience: any;
  }> {
    const systemPrompt = `Tu es un stratège marketing expert pour les marchés africains.
Tu crées des campagnes marketing complètes avec:
- Un nom accrocheur
- Une description engageante
- Une série de posts (5-10)
- Un calendrier de publication
- Une définition du public cible

Réponds UNIQUEMENT en JSON avec:
{"name":"...","description":"...","posts":[{"title":"...","text":"...","platform":"...","type":"..."}],"schedule":[{"date":"...","postIndex":0,"platform":"..."}],"targetAudience":{...}}`;

    const userPrompt = `Crée une campagne marketing:
Objectif: ${dto.objective}
Entreprise: ${companyProfile?.name || 'Entreprise'}
Secteur: ${companyProfile?.sector || 'Commerce'}
Budget: ${dto.budget || 0} XOF
Durée: du ${dto.startDate} au ${dto.endDate}
Plateformes: ${dto.platforms?.join(', ') || 'Facebook, Instagram'}
Public cible: ${JSON.stringify(dto.targetAudience || {})}`;

    if (!this.openaiApiKey) {
      return this.generatePlaceholderCampaign(dto, companyProfile);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: this.openaiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      });

      if (!response.ok) {
        return this.generatePlaceholderCampaign(dto, companyProfile);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      try {
        return JSON.parse(content);
      } catch {
        return this.generatePlaceholderCampaign(dto, companyProfile);
      }
    } catch (error) {
      this.logger.error(`Error generating campaign: ${error.message}`);
      return this.generatePlaceholderCampaign(dto, companyProfile);
    }
  }

  async generateEditorialCalendar(companyId: string, month: number, year: number, themes: string[]): Promise<{
    title: string;
    items: any[];
  }> {
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const monthName = monthNames[month - 1];

    const systemPrompt = `Tu es un planificateur de contenu expert pour les marchés africains.
Tu crées un calendrier éditorial mensuel avec:
- Posts produits (lundi, jeudi)
- Posts éducatifs (mardi)
- Témoignages (mercredi)
- Contenu culturel/fêtes (selon le mois)
- Promotions (vendredi)
- Engagement/Questions (week-end)

Jours fériés et événements africains à considérer:
- 1er Janvier: Nouvel An
- 8 Mars: Journée femme
- Avril: Pâques, Ramadan (variable)
- 1er Mai: Fête du travail
- 15 Août: Assomption
- 31 Octobre: Fête nationale (Burkina)
- 1er Novembre: Toussaint
- 25 Décembre: Noël
- Tabaski, Korité (dates variables)

Réponds UNIQUEMENT en JSON:
{"title":"Calendrier ${monthName} ${year}","items":[{"date":"YYYY-MM-DD","type":"product|educational|testimonial|promotion|cultural|engagement","title":"...","platform":"...","notes":"..."}]}`;

    const userPrompt = `Crée un calendrier éditorial pour ${monthName} ${year}
Thèmes à couvrir: ${themes?.join(', ') || 'Produits, conseils, actualités'}
Entreprise ID: ${companyId}

Contraintes:
- 2-3 posts par semaine minimum
- Varier les types de contenu
- Inclure les événements culturels du mois
- Adapter au public africain francophone`;

    if (!this.openaiApiKey) {
      return this.generatePlaceholderCalendar(month, year, themes);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: this.openaiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        return this.generatePlaceholderCalendar(month, year, themes);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      try {
        return JSON.parse(content);
      } catch {
        return this.generatePlaceholderCalendar(month, year, themes);
      }
    } catch (error) {
      this.logger.error(`Error generating editorial calendar: ${error.message}`);
      return this.generatePlaceholderCalendar(month, year, themes);
    }
  }

  async generateAdCopy(product: any, platform: string, objective: string): Promise<string> {
    const systemPrompt = `Tu es un copywriter expert en publicité digitale pour les marchés africains.
Tu crées des textes publicitaires percutants qui:
- Captent l'attention en 3 secondes
- Mettent en valeur les bénéfices (pas les caractéristiques)
- Utilisent l'urgence et la rareté
- Incluent un appel à l'action clair
- Résonnent avec le public africain

Réponds UNIQUEMENT avec le texte publicitaire (max 150 caractères pour le principal).`;

    const userPrompt = `Crée une publicité pour:
Produit: ${product?.name || 'Produit'}
Description: ${product?.description || 'Description du produit'}
Prix: ${product?.price || 'Prix'} XOF
Plateforme: ${platform}
Objectif: ${objective}

Le texte doit être en français avec un ton adapté au public africain.`;

    if (!this.openaiApiKey) {
      return `Découvrez ${product?.name || 'notre produit'} à seulement ${product?.price || 'un prix'} XOF ! ${objective === 'conversions' ? 'Commandez maintenant !' : 'Suivez-nous pour plus d\'infos !'}`;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: this.openaiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        return `Découvrez ${product?.name || 'notre produit'} à seulement ${product?.price || 'un prix'} XOF !`;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || `Découvrez ${product?.name || 'notre produit'} !`;
    } catch (error) {
      this.logger.error(`Error generating ad copy: ${error.message}`);
      return `Découvrez ${product?.name || 'notre produit'} à un prix imbattable !`;
    }
  }

  async generateHashtags(content: string, platform: string, count: number = 10): Promise<string[]> {
    const systemPrompt = `Tu es un expert en hashtags pour les réseaux sociaux africains.
Tu génères des hashtags pertinents qui:
- Mélange français et anglais
- Incluent des hashtags populaires en Afrique de l'Ouest
- Sont spécifiques au contenu et au secteur
- Optimisés pour la plateforme ${platform}

Hashtags populaires africains à considérer: #Africa #Afrique #BurkinaFaso #Ouagadougou #AfricanBusiness #MadeInAfrica #AfroBusiness #WestAfrica

Réponds UNIQUEMENT en JSON: ["#hashtag1","#hashtag2",...]`;

    const userPrompt = `Génère ${count} hashtags pour ce contenu:
"${content}"
Plateforme: ${platform}

Mélange:
- 40% hashtags africains/généraux
- 30% hashtags spécifiques au contenu
- 20% hashtags de localisation
- 10% hashtags tendance`;

    if (!this.openaiApiKey) {
      return this.generatePlaceholderHashtags(content, count);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: this.openaiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        return this.generatePlaceholderHashtags(content, count);
      }

      const data = await response.json();
      const result = data.choices?.[0]?.message?.content;

      try {
        return JSON.parse(result);
      } catch {
        return this.generatePlaceholderHashtags(content, count);
      }
    } catch (error) {
      this.logger.error(`Error generating hashtags: ${error.message}`);
      return this.generatePlaceholderHashtags(content, count);
    }
  }

  async translateContent(content: string, targetLanguage: string): Promise<string> {
    const languageNames: Record<string, string> = {
      fr: 'français',
      en: 'anglais',
      mooré: 'Mooré',
      dioula: 'Dioula',
      wolof: 'Wolof',
      bambara: 'Bambara',
    };

    const targetLang = languageNames[targetLanguage] || targetLanguage;

    const systemPrompt = `Tu es un traducteur expert spécialisé dans les langues africaines.
Tu traduis le contenu marketing en conservant:
- Le ton et le style du message original
- Les références culturelles adaptées à la langue cible
- Les expressions idiomatiques naturelles
- L'intention marketing

Réponds UNIQUEMENT avec la traduction, sans explications.`;

    const userPrompt = `Traduis ce contenu en ${targetLang}:
"${content}"

Conserve le ton marketing et adapte les références culturelles si nécessaire.`;

    if (!this.openaiApiKey) {
      return `[Traduction en ${targetLang}] ${content}`;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: this.openaiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        return `[Traduction en ${targetLang}] ${content}`;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || content;
    } catch (error) {
      this.logger.error(`Error translating content: ${error.message}`);
      return content;
    }
  }

  private generatePlaceholderPost(dto: CreateContentDto, companyProfile: any): {
    text: string;
    hashtags: string[];
    callToAction: string;
    suggestedImagePrompt: string;
  } {
    const topic = dto.topic || 'nos produits';
    return {
      text: `🌟 Découvrez ${topic} chez ${companyProfile?.name || 'notre entreprise'} ! Qualité premium, prix imbattables. ${dto.callToAction || 'Contactez-nous dès maintenant !'}`,
      hashtags: ['#Afrique', '#BurkinaFaso', '#MadeInAfrica', '#Qualité', '#BonPlan'],
      callToAction: dto.callToAction || 'Contactez-nous au XX XX XX XX',
      suggestedImagePrompt: `Image marketing pour ${topic}, style vibrant africain, couleurs chaudes, ambiance positive`,
    };
  }

  private generatePlaceholderIdeas(companyProfile: any, count: number): string[] {
    const sector = companyProfile?.sector || 'Commerce';
    const ideas = [
      `5 raisons de choisir nos produits ${sector} cette semaine`,
      `Témoignage client: Comment ${companyProfile?.name || 'notre entreprise'} a changé leur quotidien`,
      `Le saviez-vous? Une astuce de notre équipe ${sector}`,
      `Préparez-vous avec nous pour la Tabaski !`,
      `Nouveauté: Découvrez notre dernière collection ${sector}`,
      `Question du jour: Quel est votre plus grand défi en ${sector}?`,
      `Behind the scenes: Une journée typique chez ${companyProfile?.name || 'nous'}`,
      `Offre spéciale: -20% sur une sélection de produits ${sector}`,
    ];
    return ideas.slice(0, count);
  }

  private generatePlaceholderCampaign(dto: any, companyProfile: any): {
    name: string;
    description: string;
    posts: any[];
    schedule: any[];
    targetAudience: any;
  } {
    return {
      name: `Campagne ${dto.objective || 'marketing'} - ${companyProfile?.name || 'Entreprise'}`,
      description: `Campagne marketing pour ${dto.objective || 'augmenter la visibilité'}`,
      posts: [
        { title: 'Lancement campagne', text: 'Découvrez nos nouveautés !', platform: 'facebook', type: 'announcement' },
        { title: 'Témoignage', text: 'Ce que nos clients disent de nous', platform: 'instagram', type: 'testimonial' },
        { title: 'Promotion', text: 'Offre spéciale limitée !', platform: 'all', type: 'promotion' },
      ],
      schedule: [
        { date: dto.startDate, postIndex: 0, platform: 'facebook' },
        { date: dto.endDate, postIndex: 2, platform: 'instagram' },
      ],
      targetAudience: dto.targetAudience || { location: 'Burkina Faso', ageRange: '18-45' },
    };
  }

  private generatePlaceholderCalendar(month: number, year: number, themes: string[]): {
    title: string;
    items: any[];
  } {
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const items = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day += 3) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const types = ['product', 'educational', 'testimonial', 'promotion', 'cultural', 'engagement'];
      const type = types[dayOfWeek % types.length];

      items.push({
        date: date.toISOString().split('T')[0],
        type,
        title: `Post ${type} - ${day}`,
        platform: dayOfWeek % 2 === 0 ? 'facebook' : 'instagram',
        notes: themes?.length ? `Thème: ${themes[day % themes.length]}` : '',
      });
    }

    return {
      title: `Calendrier ${monthNames[month - 1]} ${year}`,
      items,
    };
  }

  private generatePlaceholderHashtags(content: string, count: number): string[] {
    const baseHashtags = ['#Afrique', '#BurkinaFaso', '#MadeInAfrica', '#Business', '#Entrepreneur'];
    const contentWords = content.split(' ').filter(w => w.length > 4).slice(0, count - baseHashtags.length);
    const contentHashtags = contentWords.map(w => `#${w.replace(/[^a-zA-Z0-9]/g, '')}`);
    return [...baseHashtags, ...contentHashtags].slice(0, count);
  }
}
