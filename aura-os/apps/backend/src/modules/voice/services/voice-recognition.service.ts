import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../inventory/entities/product.entity';

export interface ExtractedItem {
  productName: string;
  quantity: number;
  matchedProductId: string | null;
  matchedProductName: string | null;
  confidence: number;
  unitPrice: number | null;
}

export interface ProductMatch {
  productId: string;
  productName: string;
  confidence: number;
  unitPrice: number;
}

export interface TranscriptionResult {
  transcribedText: string;
  extractedItems: ExtractedItem[];
}

export interface VoiceSaleResult {
  transcriptionId: string;
  transcribedText: string;
  processedText: string;
  items: ExtractedItem[];
  overallConfidence: number;
  status: string;
  salePreview: {
    subtotal: number;
    itemCount: number;
  } | null;
}

const LANGUAGE_SUPPORT: Record<string, { name: string; whisperCode: string; supported: boolean; variant?: boolean }> = {
  'fr': { name: 'Français', whisperCode: 'fr', supported: true },
  'fr-FR': { name: 'Français', whisperCode: 'fr', supported: true },
  'fr-african': { name: 'Français africain', whisperCode: 'fr', supported: true, variant: true },
  'bm': { name: 'Mooré', whisperCode: 'fr', supported: true, variant: true },
  'dy': { name: 'Dioula', whisperCode: 'fr', supported: true, variant: true },
  'ff': { name: 'Fulfulde', whisperCode: 'fr', supported: true, variant: true },
  'en': { name: 'English', whisperCode: 'en', supported: true },
};

const AFRICAN_FRENCH_NUMBERS: Record<string, number> = {
  'un': 1, 'une': 1,
  'deux': 2,
  'trois': 3,
  'quatre': 4,
  'cinq': 5,
  'six': 6,
  'sept': 7,
  'huit': 8,
  'neuf': 9,
  'dix': 10,
  'onze': 11,
  'douze': 12,
  'treize': 13,
  'quatorze': 14,
  'quinze': 15,
  'seize': 16,
  'vingt': 20,
  'trente': 30,
  'quarante': 40,
  'cinquante': 50,
  'soixante': 60,
  'cent': 100,
};

const MOORE_FRENCH_MAP: Record<string, string> = {
  'kango': 'ciment',
  'briki': 'brique',
  'fer': 'fer',
  'sak': 'sac',
  'puisi': 'planche',
  'bulu': 'boulon',
};

const DIOLA_FRENCH_MAP: Record<string, string> = {
  'siman': 'ciment',
  'brik': 'brique',
  'fek': 'fer',
  'sak': 'sac',
};

const FULFULDE_FRENCH_MAP: Record<string, string> = {
  'siman': 'ciment',
  'brik': 'brique',
  'kare': 'fer',
  'sak': 'sac',
};

const PRODUCT_ALIASES: Record<string, string[]> = {
  'ciment': ['ciment', 'sac ciment', 'sac de ciment', 'ciment 50kg', 'ciment ashaka', 'kango'],
  'brique': ['brique', 'briques', 'brique rouge', 'brique creuse', 'briki'],
  'fer': ['fer', 'fer a beton', 'fer à béton', 'fer 8mm', 'fer 10mm', 'fer 12mm', 'barre de fer'],
  'planche': ['planche', 'planches', 'planche bois', 'puisi'],
  'sable': ['sable', 'sable fin', 'sable grossier'],
  'gravier': ['gravier', 'graviers'],
  'boulon': ['boulon', 'boulons', 'vis', 'ecrou', 'écrou'],
  'peinture': ['peinture', 'peinture murale', 'peinture exterieure', 'bidon peinture'],
  'tuile': ['tuile', 'tuiles', 'tuile ciment', 'tuile toiture'],
  'cable': ['cable', 'câble', 'fil electrique', 'fil électrique'],
  'tuyau': ['tuyau', 'tuyaux', 'tuyau pvc', 'tube pvc'],
};

@Injectable()
export class VoiceRecognitionService {
  private readonly logger = new Logger(VoiceRecognitionService.name);
  private readonly openaiApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY', '');
  }

  getSupportedLanguages(): Record<string, { name: string; whisperCode: string; supported: boolean; variant?: boolean }> {
    return LANGUAGE_SUPPORT;
  }

  async processAudio(audioBase64: string, language: string = 'fr-FR'): Promise<TranscriptionResult> {
    const whisperCode = LANGUAGE_SUPPORT[language]?.whisperCode || 'fr';

    if (!this.openaiApiKey) {
      this.logger.warn('OpenAI API key not configured, returning placeholder transcription');
      return this.getPlaceholderTranscription(audioBase64, language);
    }

    try {
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const transcription = await this.transcribeWithWhisper(audioBuffer, whisperCode);
      const extractedItems = await this.extractItemsFromText(transcription, null);

      return {
        transcribedText: transcription,
        extractedItems,
      };
    } catch (error) {
      this.logger.error(`Error processing audio: ${error.message}`);
      throw new BadRequestException('Erreur lors du traitement audio');
    }
  }

  async extractItemsFromText(text: string, companyId: string | null): Promise<ExtractedItem[]> {
    const normalizedText = this.normalizeText(text);
    const products = companyId
      ? await this.productRepository.find({ where: { companyId, isActive: true } })
      : [];

    const llmExtracted = await this.extractWithLlm(normalizedText, products);
    const regexExtracted = this.extractWithRegex(normalizedText);

    const mergedItems = this.mergeExtractions(llmExtracted, regexExtracted);

    if (products.length > 0) {
      for (const item of mergedItems) {
        const match = this.matchProduct(item.productName, products);
        if (match && match.confidence > 0.5) {
          item.matchedProductId = match.productId;
          item.matchedProductName = match.productName;
          item.confidence = match.confidence;
          item.unitPrice = match.unitPrice;
        }
      }
    }

    return mergedItems;
  }

  matchProduct(fuzzyName: string, products: Product[]): ProductMatch | null {
    if (!fuzzyName || products.length === 0) {
      return null;
    }

    const normalizedInput = this.normalizeText(fuzzyName);
    let bestMatch: ProductMatch | null = null;
    let bestScore = 0;

    for (const product of products) {
      const normalizedProduct = this.normalizeText(product.name);

      const aliasScore = this.getAliasMatchScore(normalizedInput, normalizedProduct);
      const levenshteinScore = this.getLevenshteinScore(normalizedInput, normalizedProduct);
      const partialScore = this.getPartialMatchScore(normalizedInput, normalizedProduct);

      const maxScore = Math.max(aliasScore, levenshteinScore, partialScore);

      if (maxScore > bestScore && maxScore > 0.4) {
        bestScore = maxScore;
        bestMatch = {
          productId: product.id,
          productName: product.name,
          confidence: Math.round(maxScore * 100) / 100,
          unitPrice: Number(product.price),
        };
      }
    }

    return bestMatch;
  }

  private async transcribeWithWhisper(audioBuffer: Buffer, language: string): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([audioBuffer as BlobPart], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openaiApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      this.logger.error(`Whisper API error: ${response.status} ${response.statusText}`);
      throw new Error('Transcription failed');
    }

    const data = await response.json();
    return data.text || '';
  }

  private async extractWithLlm(text: string, products: Product[]): Promise<ExtractedItem[]> {
    if (!this.openaiApiKey) {
      return [];
    }

    const productList = products.length > 0
      ? products.map(p => `${p.name} (${p.sku})`).join(', ')
      : 'ciment, brique, fer, planche, sable, gravier, boulon, peinture, tuile, cable, tuyau';

    const systemPrompt = `Tu es un assistant de vente vocale pour AURA OS, un système de point de vente utilisé en Afrique de l'Ouest.
Ta mission: extraire les produits et quantités d'une transcription vocale.

Règles importantes:
- Les nombres peuvent être en français écrit (deux, trois, dix, vingt) ou en chiffres (2, 3, 10, 20)
- Les produits peuvent avoir des variations régionales (ex: "ciment" peut être "sac ciment", "kango" en Mooré)
- Les unités comme "sac", "kg", "tonne", "mètre" doivent être ignorées pour le nom du produit
- Si la quantité n'est pas spécifiée, utiliser 1 par défaut

Formats de phrases attendus:
- "2 sacs de ciment et 10 briques"
- "deux sacs ciment dix briques et cinq fer douze"
- "un sac ciment plus dix briques"
- "cinq fer huit" (5 barres de fer 8mm)
- "kango 2 brik 10" (Mooré: 2 ciments, 10 briques)

Réponds UNIQUEMENT en JSON avec ce format:
[
  {"productName": "ciment", "quantity": 2},
  {"productName": "brique", "quantity": 10}
]`;

    const userPrompt = `Transcription: "${text}"
Produits disponibles: ${productList}
Extrais les produits et quantités.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        this.logger.error(`OpenAI API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      try {
        const parsed = JSON.parse(content);
        return parsed.map((item: any) => ({
          productName: item.productName || item.product || item.name || '',
          quantity: Number(item.quantity || item.qty || 1),
          matchedProductId: null,
          matchedProductName: null,
          confidence: 0,
          unitPrice: null,
        }));
      } catch {
        this.logger.warn('Failed to parse LLM extraction response');
        return [];
      }
    } catch (error) {
      this.logger.error(`Error extracting with LLM: ${error.message}`);
      return [];
    }
  }

  private extractWithRegex(text: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    const normalizedText = text.toLowerCase();

    const numberWords = Object.keys(AFRICAN_FRENCH_NUMBERS).join('|');
    const patterns = [
      new RegExp(`(\\d+|${numberWords})\\s*(?:sacs?\\s+)?(?:de\\s+)?([\\w\\s]+?)(?:\\s+(?:et|,|\\+|plus|$))`, 'gi'),
      new RegExp(`([\\w\\s]+?)\\s+(\\d+|${numberWords})(?:\\s|$)`, 'gi'),
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(normalizedText)) !== null) {
        let quantity: number;
        let productName: string;

        if (match[1] && match[2]) {
          const first = match[1].trim();
          const second = match[2].trim();

          if (/^\d+$/.test(first)) {
            quantity = parseInt(first, 10);
            productName = second;
          } else if (AFRICAN_FRENCH_NUMBERS[first]) {
            quantity = AFRICAN_FRENCH_NUMBERS[first];
            productName = second;
          } else if (/^\d+$/.test(second)) {
            quantity = parseInt(second, 10);
            productName = first;
          } else if (AFRICAN_FRENCH_NUMBERS[second]) {
            quantity = AFRICAN_FRENCH_NUMBERS[second];
            productName = first;
          } else {
            continue;
          }
        } else {
          continue;
        }

        productName = this.cleanProductName(productName);
        if (productName && quantity > 0) {
          items.push({
            productName,
            quantity,
            matchedProductId: null,
            matchedProductName: null,
            confidence: 0,
            unitPrice: null,
          });
        }
      }
    }

    return items;
  }

  private mergeExtractions(llmItems: ExtractedItem[], regexItems: ExtractedItem[]): ExtractedItem[] {
    if (llmItems.length === 0) return regexItems;
    if (regexItems.length === 0) return llmItems;

    const merged: ExtractedItem[] = [...llmItems];

    for (const regexItem of regexItems) {
      const exists = merged.some(
        m => this.normalizeText(m.productName) === this.normalizeText(regexItem.productName)
      );
      if (!exists) {
        merged.push(regexItem);
      }
    }

    return merged;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanProductName(name: string): string {
    const units = ['sac', 'sacs', 'kg', 'tonne', 'tonnes', 'metre', 'metres', 'm', 'cm', 'mm', 'bidon', 'bidons', 'boite', 'boites', 'paquet', 'paquets'];
    let cleaned = name.toLowerCase().trim();

    for (const unit of units) {
      cleaned = cleaned.replace(new RegExp(`\\b${unit}\\b`, 'gi'), '');
    }

    cleaned = cleaned.replace(/\b(de|et|le|la|les|un|une|des)\b/gi, '');

    return cleaned.trim();
  }

  private getAliasMatchScore(input: string, productName: string): number {
    for (const [canonical, aliases] of Object.entries(PRODUCT_ALIASES)) {
      const allNames = [canonical, ...aliases];
      for (const name of allNames) {
        if (input.includes(name) || name.includes(input)) {
          const productHasCanonical = allNames.some(alias => productName.includes(alias));
          if (productHasCanonical) {
            return 0.95;
          }
        }
      }
    }

    for (const [moore, french] of Object.entries(MOORE_FRENCH_MAP)) {
      if (input.includes(moore) && productName.includes(french)) {
        return 0.9;
      }
    }

    for (const [dioula, french] of Object.entries(DIOLA_FRENCH_MAP)) {
      if (input.includes(dioula) && productName.includes(french)) {
        return 0.9;
      }
    }

    for (const [fulfulde, french] of Object.entries(FULFULDE_FRENCH_MAP)) {
      if (input.includes(fulfulde) && productName.includes(french)) {
        return 0.9;
      }
    }

    return 0;
  }

  private getLevenshteinScore(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const maxLen = Math.max(len1, len2);

    if (maxLen === 0) return 1;

    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    return 1 - distance / maxLen;
  }

  private getPartialMatchScore(input: string, productName: string): number {
    if (productName.includes(input)) {
      return 0.8 * (input.length / productName.length);
    }
    if (input.includes(productName)) {
      return 0.7 * (productName.length / input.length);
    }

    const inputWords = input.split(' ');
    const productWords = productName.split(' ');
    let matchCount = 0;

    for (const iw of inputWords) {
      for (const pw of productWords) {
        if (iw === pw || iw.includes(pw) || pw.includes(iw)) {
          matchCount++;
          break;
        }
      }
    }

    if (matchCount > 0) {
      return 0.6 * (matchCount / inputWords.length);
    }

    return 0;
  }

  private getPlaceholderTranscription(audioBase64: string, language: string): TranscriptionResult {
    this.logger.warn('Using placeholder transcription - configure OPENAI_API_KEY for real transcription');

    const sampleText = 'deux sacs de ciment et dix briques';
    const extractedItems = this.extractWithRegex(sampleText);

    return {
      transcribedText: sampleText,
      extractedItems,
    };
  }
}
