import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface StreamCallbacks {
  onToken: (token: string) => void | Promise<void>;
  onComplete: (fullText: string) => void | Promise<void>;
  onError: (error: Error) => void | Promise<void>;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    // Support both OPENAI_API_KEY and OPENROUTER_API_KEY
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY', '')
      || process.env.OPENAI_API_KEY
      || process.env.OPENROUTER_API_KEY
      || '';
    this.model = this.configService.get<string>('OPENAI_MODEL', '')
      || process.env.OPENAI_MODEL
      || process.env.OPENROUTER_MODEL
      || 'openrouter/owl-alpha';
    this.baseUrl = this.configService.get<string>('openai.baseUrl', '')
      || process.env.OPENAI_BASE_URL
      || 'https://openrouter.ai/api/v1';
  }

  /**
   * Build the full URL for chat completions
   */
  private get chatUrl(): string {
    const base = this.baseUrl.replace(/\/+$/, '');
    // If baseUrl already contains /chat/completions, don't append
    if (base.endsWith('/chat/completions')) return base;
    // If baseUrl ends with /v1, append /chat/completions
    return `${base}/chat/completions`;
  }

  /**
   * Generate a non-streaming response with retry on rate limit
   */
  async generateResponse(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
    context?: any,
  ): Promise<string> {
    if (!this.apiKey) {
      this.logger.warn('No API key configured, returning placeholder');
      return this.generatePlaceholderResponse(context);
    }

    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(this.chatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://aura-os.com',
            'X-Title': 'AURA OS',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
            ],
            temperature: 0.7,
            max_tokens: 4000,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.status === 429) {
          const retryAfter = Math.max(parseInt(response.headers.get('Retry-After') || '10', 10), 10);
          this.logger.warn(`Rate limited (attempt ${attempt + 1}/${maxRetries + 1}), retrying after ${retryAfter}s`);
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, retryAfter * 1000));
            continue;
          }
        }

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          this.logger.error(`LLM API error: ${response.status} ${errText}`);
          return this.generatePlaceholderResponse(context);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && !content.includes('Configurez OPENAI_API_KEY')) {
          return content;
        }
        return content || this.generatePlaceholderResponse(context);
      } catch (error: any) {
        this.logger.error(`LLM error (attempt ${attempt + 1}): ${error.message}`);
        if (attempt === maxRetries) {
          return this.generatePlaceholderResponse(context);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    return this.generatePlaceholderResponse(context);
  }

  /**
   * Generate a streaming response — calls onToken for each chunk, onComplete when done
   */
  async generateStream(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    if (!this.apiKey) {
      const placeholder = 'Mode démo — configurez OPENAI_API_KEY pour des réponses IA complètes.';
      await callbacks.onToken(placeholder);
      await callbacks.onComplete(placeholder);
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(this.chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://aura-os.com',
          'X-Title': 'AURA OS',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`LLM API error ${response.status}: ${errText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.substring(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content || '';
            if (token) {
              fullText += token;
              await callbacks.onToken(token);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      await callbacks.onComplete(fullText);
    } catch (error: any) {
      this.logger.error(`Stream error: ${error.message}`);
      await callbacks.onError(error);
    }
  }

  /**
   * Analyze interview data — returns structured analysis
   */
  async analyzeInterview(interviewData: any): Promise<{
    sector: string;
    subSector: string;
    size: string;
    needs: string[];
    objectives: string[];
    challenges: string[];
    opportunities: string[];
    businessModel: string;
    targetClients: string[];
    estimatedRevenue: string;
    automationPotential: string[];
    recommendedSections: string[];
  }> {
    if (!this.apiKey) {
      return this.generatePlaceholderAnalysis(interviewData);
    }

    const systemPrompt = `Tu es un expert en analyse d'entreprise pour les PME africaines. Tu dois identifier PRÉCISÉMENT le secteur d'activité.

SECTEURS DISPONIBLES (choisis UN SEUL) :
- hotel : hôtel, motel, auberge, hébergement, chambre d'hôtes
- restaurant : restaurant, maquis, fast-food, traiteur, cantine, food
- commerce : boutique, magasin, shop, vente au détail, supermarché, marché
- transport : transport, livraison, logistique, taxi, bus, colis, flotte
- clinic : clinique, cabinet médical, centre de santé, pharmacie, laboratoire
- sports : club sportif, football, basket, salle de sport, fitness, compétition
- beauty : salon de coiffure, beauté, esthétique, spa, manucure, barber
- school : école, formation, cours, université, éducation, apprentissage
- agriculture : agriculture, culture, élevage, ferme, récolte, irrigation
- construction : construction, BTP, bâtiment, chantier, travaux, immobilier
- service : service, consulting, conseil, agence, bureau, prestation
- other : autre secteur non listè ci-dessus

RÈGLE CRITIQUE : Lis attentivement TOUTES les réponses. Identifie les mots-clés métier. Choisis le secteur le PLUS SPÉCIFIQUE.

Exemples de détection :
- "club de foot", "joueurs", "équipe", "match", "cotisations sportives" → sports
- "chambres", "réservation", "taux d'occupation", "piscine" → hotel
- "plats", "menu", "cuisine", "serveur", "commande restaurant" → restaurant
- "stock", "vente", "boutique", "caisse", "marchandises" → commerce
- "chauffeur", "véhicule", "livraison", "tournée", "flotte" → transport
- "patient", "consultation", "médecin", "ordonnance", "soin" → clinic
- "coiffure", "beauté", "salon", "manucure", "soin visage" → beauty
- "élève", "cours", "enseignant", "formation", "scolarité" → school
- "culture", "récolte", "parcelle", "élevage", "irrigation" → agriculture
- "chantier", "travaux", "bâtiment", "maçon", "construction" → construction

Retourne UNIQUEMENT un JSON valide :
{
  "sector": "LE_SECTEUR_IDENTIFIÉ",
  "subSector": "sous-secteur précis en français",
  "size": "micro|small|medium|large",
  "needs": ["besoin1", "besoin2"],
  "objectives": ["objectif1", "objectif2"],
  "challenges": ["defi1", "defi2"],
  "opportunities": ["opportunite1"],
  "businessModel": "description courte du modèle économique",
  "targetClients": ["type client 1", "type client 2"],
  "estimatedRevenue": "fourchette de revenus estimés",
  "automationPotential": ["tache1", "tache2"],
  "recommendedSections": ["overview", "section1", "section2"]
}

Les recommendedSections doivent être ADAPTÉES au secteur. Exemples :
- sports → ["overview", "players", "teams", "calendar", "finance", "communication", "settings"]
- hotel → ["overview", "bookings", "rooms", "customers", "finance", "pos", "reviews", "settings"]
- restaurant → ["overview", "pos", "inventory", "bookings", "delivery", "customers", "finance", "settings"]
- commerce → ["overview", "pos", "inventory", "customers", "suppliers", "finance", "reports", "settings"]
- transport → ["overview", "delivery", "fleet", "routes", "finance", "reports", "settings"]
- clinic → ["overview", "appointments", "patients", "pharmacy", "billing", "finance", "settings"]
- beauty → ["overview", "appointments", "customers", "inventory", "marketing", "finance", "settings"]
- school → ["overview", "students", "teachers", "calendar", "finance", "communication", "settings"]
- agriculture → ["overview", "crops", "inventory", "weather", "finance", "reports", "settings"]
- construction → ["overview", "projects", "inventory", "finance", "hr", "reports", "settings"]

JSON UNIQUEMENT. Pas de texte avant ou après.`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000);

      const response = await fetch(this.chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://aura-os.com',
          'X-Title': 'AURA OS',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(interviewData) },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return this.generatePlaceholderAnalysis(interviewData);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // Extract JSON
      let jsonStr = content.replace(/```json/gi, '').replace(/```/g, '');
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start >= 0 && end > start) {
        jsonStr = jsonStr.substring(start, end + 1);
        try {
          return JSON.parse(jsonStr);
        } catch {
          this.logger.warn('Failed to parse interview analysis JSON');
        }
      }
      return this.generatePlaceholderAnalysis(interviewData);
    } catch (error: any) {
      this.logger.error(`Interview analysis error: ${error.message}`);
      return this.generatePlaceholderAnalysis(interviewData);
    }
  }

  /**
   * Generate a dynamic agent prompt based on company profile
   */
  async generateAgentPrompt(companyProfile: any, agentType: string): Promise<string> {
    if (!this.apiKey) {
      return this.generatePlaceholderPrompt(companyProfile, agentType);
    }

    const systemPrompt = `Tu es un expert en conception d'agents IA. Génère un prompt système détaillé et professionnel pour un agent IA spécialisé. Le prompt doit inclure: le rôle, les responsabilités, les règles de communication, les limites, et le format de réponse attendu. Langue: français.`;

    const userPrompt = `Crée un prompt système pour un agent de type "${agentType}" dans une entreprise du secteur "${companyProfile?.sector || 'général'}" située en "${companyProfile?.country || 'Afrique'}". L'entreprise a ${companyProfile?.size || 'une taille moyenne'}.`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000);

      const response = await fetch(this.chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://aura-os.com',
          'X-Title': 'AURA OS',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 4000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return this.generatePlaceholderPrompt(companyProfile, agentType);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || this.generatePlaceholderPrompt(companyProfile, agentType);
    } catch (error: any) {
      this.logger.error(`Agent prompt error: ${error.message}`);
      return this.generatePlaceholderPrompt(companyProfile, agentType);
    }
  }

  /**
   * Generate daily report
   */
  async generateDailyReport(companyData: any): Promise<string> {
    if (!this.apiKey) {
      return 'Rapport journalier: Configurez OPENAI_API_KEY pour générer des rapports automatiques.';
    }

    const systemPrompt = `Tu es un analyste business senior. Génère un rapport journalier clair et actionnable basé sur les données de l'entreprise. Inclure: résumé, KPIs, alertes, recommandations.`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000);

      const response = await fetch(this.chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://aura-os.com',
          'X-Title': 'AURA OS',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(companyData) },
          ],
          temperature: 0.4,
          max_tokens: 4000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) return 'Erreur lors de la génération du rapport.';
      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Rapport non disponible.';
    } catch (error: any) {
      this.logger.error(`Daily report error: ${error.message}`);
      return 'Erreur lors de la génération du rapport.';
    }
  }

  /**
   * Detect fraud patterns
   */
  async detectFraudPatterns(transactionData: any): Promise<any> {
    if (!this.apiKey) {
      return { riskLevel: 'unknown', patterns: [], recommendation: 'Configurez OPENAI_API_KEY.' };
    }

    const systemPrompt = `Tu es un expert en détection de fraude financière. Analyse les transactions et identifie les patterns suspects. Réponds en JSON avec: riskLevel (low/medium/high/critical), patterns (array), suspiciousTransactions (array), recommendation (string).`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000);

      const response = await fetch(this.chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://aura-os.com',
          'X-Title': 'AURA OS',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(transactionData) },
          ],
          temperature: 0.2,
          max_tokens: 4000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) return { riskLevel: 'unknown', patterns: [], recommendation: 'Erreur API.' };
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      try { return JSON.parse(content); } catch { return { riskLevel: 'unknown', patterns: [], recommendation: content }; }
    } catch (error: any) {
      this.logger.error(`Fraud detection error: ${error.message}`);
      return { riskLevel: 'unknown', patterns: [], recommendation: 'Erreur.' };
    }
  }

  /**
   * Predict trends
   */
  async predictTrends(historicalData: any): Promise<any> {
    if (!this.apiKey) {
      return { trends: [], forecast: [], confidence: 0, recommendation: 'Configurez OPENAI_API_KEY.' };
    }

    const systemPrompt = `Tu es un expert en analyse prédictive. Analyse les données historiques et prédit les tendances futures. Réponds en JSON avec: trends (array), forecast (array), confidence (0-1), recommendation (string).`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000);

      const response = await fetch(this.chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://aura-os.com',
          'X-Title': 'AURA OS',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(historicalData) },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) return { trends: [], forecast: [], confidence: 0, recommendation: 'Erreur API.' };
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      try { return JSON.parse(content); } catch { return { trends: [], forecast: [], confidence: 0, recommendation: content }; }
    } catch (error: any) {
      this.logger.error(`Trend prediction error: ${error.message}`);
      return { trends: [], forecast: [], confidence: 0, recommendation: 'Erreur.' };
    }
  }

  /**
   * Extract products from speech
   */
  async extractProductsFromSpeech(
    text: string,
    availableProducts: any[],
  ): Promise<{ productName: string; quantity: number; matchedProductId: string | null; confidence: number }[]> {
    if (!this.apiKey) return this.getPlaceholderExtractedProducts(text);

    const productList = availableProducts.length > 0
      ? availableProducts.map(p => `${p.name} (${p.sku || p.id})`).join(', ')
      : 'ciment, brique, fer, planche, sable, gravier, boulon, peinture, tuile, cable, tuyau';

    const systemPrompt = `Tu es un assistant de vente vocale pour AURA OS. Extrais les produits et quantités d'une transcription vocale. Réponds UNIQUEMENT en JSON: [{"productName":"...","quantity":N},...]`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000);

      const response = await fetch(this.chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://aura-os.com',
          'X-Title': 'AURA OS',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Transcription: "${text}"\nProduits: ${productList}` },
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) return this.getPlaceholderExtractedProducts(text);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      try {
        const parsed = JSON.parse(content);
        return parsed.map((item: any) => ({
          productName: item.productName || item.product || item.name || '',
          quantity: Number(item.quantity || item.qty || 1),
          matchedProductId: null,
          confidence: 0,
        }));
      } catch { return this.getPlaceholderExtractedProducts(text); }
    } catch (error: any) {
      this.logger.error(`Product extraction error: ${error.message}`);
      return this.getPlaceholderExtractedProducts(text);
    }
  }

  // ─── Placeholder methods ───

  private getPlaceholderExtractedProducts(text: string): { productName: string; quantity: number; matchedProductId: string | null; confidence: number }[] {
    const numberMap: Record<string, number> = {
      'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
      'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
      'onze': 11, 'douze': 12, 'vingt': 20, 'trente': 30, 'cent': 100,
    };
    const results: { productName: string; quantity: number; matchedProductId: string | null; confidence: number }[] = [];
    const words = text.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const num = numberMap[word] || parseInt(word, 10);
      if (num && i + 1 < words.length) {
        const nextWord = words[i + 1].replace(/s$/, '');
        const productWords = [nextWord];
        if (i + 2 < words.length && !numberMap[words[i + 2]] && isNaN(parseInt(words[i + 2]))) {
          productWords.push(words[i + 2].replace(/s$/, ''));
        }
        results.push({ productName: productWords.join(' '), quantity: num, matchedProductId: null, confidence: 0 });
      }
    }
    return results;
  }

  private generatePlaceholderResponse(_context: any): string {
    return "Merci pour cette information. Pouvez-vous me donner plus de détails à ce sujet ?";
  }

  private generatePlaceholderAnalysis(interviewData: any): any {
    // Try to detect sector from interview text
    const text = JSON.stringify(interviewData || {}).toLowerCase();
    let sector = 'other';
    if (text.includes('foot') || text.includes('club') || text.includes('joueurs') || text.includes('match') || text.includes('sport')) sector = 'sports';
    else if (text.includes('hotel') || text.includes('chambre') || text.includes('reservation')) sector = 'hotel';
    else if (text.includes('restaurant') || text.includes('cuisine') || text.includes('menu') || text.includes('plat')) sector = 'restaurant';
    else if (text.includes('commerce') || text.includes('boutique') || text.includes('magasin') || text.includes('vente')) sector = 'commerce';
    else if (text.includes('transport') || text.includes('chauffeur') || text.includes('livraison') || text.includes('flotte')) sector = 'transport';
    else if (text.includes('patient') || text.includes('clinique') || text.includes('medecin') || text.includes('sante')) sector = 'clinic';
    else if (text.includes('salon') || text.includes('coiffure') || text.includes('beaute') || text.includes('esthetique')) sector = 'beauty';
    else if (text.includes('ecole') || text.includes('eleve') || text.includes('formation') || text.includes('cours')) sector = 'school';
    else if (text.includes('agriculture') || text.includes('culture') || text.includes('recolte') || text.includes('elevage')) sector = 'agriculture';
    else if (text.includes('construction') || text.includes('chantier') || text.includes('btp') || text.includes('travaux')) sector = 'construction';

    const sectorSections: Record<string, string[]> = {
      sports: ['overview', 'players', 'teams', 'calendar', 'finance', 'communication', 'settings'],
      hotel: ['overview', 'bookings', 'rooms', 'customers', 'finance', 'settings'],
      restaurant: ['overview', 'pos', 'inventory', 'bookings', 'customers', 'finance', 'settings'],
      commerce: ['overview', 'pos', 'inventory', 'customers', 'finance', 'settings'],
      transport: ['overview', 'delivery', 'fleet', 'routes', 'finance', 'settings'],
      clinic: ['overview', 'appointments', 'patients', 'pharmacy', 'billing', 'finance', 'settings'],
      beauty: ['overview', 'appointments', 'customers', 'inventory', 'marketing', 'finance', 'settings'],
      school: ['overview', 'students', 'teachers', 'calendar', 'finance', 'settings'],
      agriculture: ['overview', 'crops', 'inventory', 'weather', 'finance', 'settings'],
      construction: ['overview', 'projects', 'inventory', 'finance', 'hr', 'settings'],
      service: ['overview', 'customers', 'finance', 'marketing', 'settings'],
      other: ['overview', 'customers', 'finance', 'settings'],
    };

    return {
      sector,
      subSector: '',
      size: 'medium',
      needs: ['gestion', 'croissance'],
      objectives: ['development', 'efficiency'],
      challenges: ['competition', 'resources'],
      opportunities: ['digital_transformation', 'african_market'],
      businessModel: '',
      targetClients: [],
      estimatedRevenue: '',
      automationPotential: [],
      recommendedSections: sectorSections[sector] || sectorSections.other,
    };
  }

  private generatePlaceholderPrompt(companyProfile: any, agentType: string): string {
    return `Tu es un agent IA spécialisé en ${agentType} pour une entreprise du secteur ${companyProfile?.sector || 'général'}. Tu aides l'entreprise à optimiser ses opérations. Réponds de manière professionnelle, concise et actionnable. Langue: français.`;
  }
}
