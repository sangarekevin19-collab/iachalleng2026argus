import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { VoiceTranscription, TranscriptionStatus } from '../entities/voice-transcription.entity';
import { VoiceRecognitionService, ExtractedItem, VoiceSaleResult } from './voice-recognition.service';
import { PosService } from '../../pos/pos.service';
import { ConfirmVoiceSaleDto } from '../dto/confirm-voice-sale.dto';
import { Sale, PaymentMethod } from '../../pos/entities/sale.entity';

export interface VoiceStats {
  totalTranscriptions: number;
  successRate: number;
  avgConfidence: number;
  mostUsedLanguage: string;
  byStatus: Record<string, number>;
  byLanguage: Record<string, number>;
}

@Injectable()
export class VoiceProcessorService {
  private readonly logger = new Logger(VoiceProcessorService.name);
  private readonly AUTO_CONFIDENCE_THRESHOLD = 0.8;

  constructor(
    @InjectRepository(VoiceTranscription)
    private readonly transcriptionRepository: Repository<VoiceTranscription>,
    private readonly voiceRecognitionService: VoiceRecognitionService,
    private readonly posService: PosService,
  ) {}

  async processVoiceSale(
    audioBase64: string,
    companyId: string,
    userId: string,
    language: string = 'fr-FR',
  ): Promise<VoiceSaleResult> {
    const transcription = this.transcriptionRepository.create({
      companyId,
      userId,
      language,
      status: TranscriptionStatus.PROCESSING,
    });
    const savedTranscription = await this.transcriptionRepository.save(transcription);

    try {
      const result = await this.voiceRecognitionService.processAudio(audioBase64, language);

      const products = await this.voiceRecognitionService.extractItemsFromText(
        result.transcribedText,
        companyId,
      );

      const overallConfidence = products.length > 0
        ? products.reduce((sum, item) => sum + (item.confidence || 0), 0) / products.length
        : 0;

      const allMatched = products.every(item => item.matchedProductId && item.confidence > 0.5);
      const someMatched = products.some(item => item.matchedProductId && item.confidence > 0.5);

      let status: TranscriptionStatus;
      if (products.length === 0) {
        status = TranscriptionStatus.FAILED;
      } else if (allMatched && overallConfidence >= this.AUTO_CONFIDENCE_THRESHOLD) {
        status = TranscriptionStatus.MATCHED;
      } else if (someMatched) {
        status = TranscriptionStatus.PARTIAL;
      } else {
        status = TranscriptionStatus.FAILED;
      }

      savedTranscription.transcribedText = result.transcribedText;
      savedTranscription.processedText = result.transcribedText;
      savedTranscription.extractedItems = products.map(p => ({
        productName: p.productName,
        quantity: p.quantity,
        matchedProductId: p.matchedProductId,
        matchedProductName: p.matchedProductName,
        confidence: p.confidence,
        unitPrice: p.unitPrice,
      }));
      savedTranscription.status = status;
      savedTranscription.overallConfidence = Math.round(overallConfidence * 100) / 100;
      savedTranscription.processedAt = new Date();

      await this.transcriptionRepository.save(savedTranscription);

      let salePreview = null;
      if (products.length > 0 && products.some(p => p.unitPrice)) {
        const subtotal = products.reduce((sum, item) => {
          return sum + (item.unitPrice ? item.unitPrice * item.quantity : 0);
        }, 0);
        salePreview = {
          subtotal: Math.round(subtotal * 100) / 100,
          itemCount: products.length,
        };
      }

      return {
        transcriptionId: savedTranscription.id,
        transcribedText: result.transcribedText,
        processedText: result.transcribedText,
        items: products,
        overallConfidence: Math.round(overallConfidence * 100) / 100,
        status,
        salePreview,
      };
    } catch (error) {
      this.logger.error(`Error processing voice sale: ${error.message}`);
      savedTranscription.status = TranscriptionStatus.FAILED;
      savedTranscription.processedAt = new Date();
      await this.transcriptionRepository.save(savedTranscription);
      throw error;
    }
  }

  async confirmVoiceSale(
    dto: ConfirmVoiceSaleDto,
    companyId: string,
    userId: string,
  ): Promise<Sale> {
    const transcription = await this.transcriptionRepository.findOne({
      where: { id: dto.transcriptionId, companyId },
    });

    if (!transcription) {
      throw new NotFoundException(`Transcription ${dto.transcriptionId} non trouvée`);
    }

    if (transcription.status === TranscriptionStatus.CONFIRMED) {
      throw new BadRequestException('Cette transcription a déjà été confirmée');
    }

    const confirmedItems = dto.items.filter(item => item.confirmed);

    if (confirmedItems.length === 0) {
      throw new BadRequestException('Au moins un article doit être confirmé');
    }

    const sale = await this.posService.createSale(companyId, userId, {
      items: confirmedItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      paymentMethod: (dto.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
      customerName: dto.customerName || null,
    });

    transcription.saleId = sale.id;
    transcription.status = TranscriptionStatus.CONFIRMED;
    await this.transcriptionRepository.save(transcription);

    this.logger.log(`Voice sale confirmed: transcription ${transcription.id} -> sale ${sale.id}`);

    return sale;
  }

  async getTranscriptionHistory(
    companyId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: VoiceTranscription[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.transcriptionRepository.findAndCount({
      where: { companyId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getTranscriptionById(id: string, companyId: string): Promise<VoiceTranscription> {
    const transcription = await this.transcriptionRepository.findOne({
      where: { id, companyId },
    });

    if (!transcription) {
      throw new NotFoundException(`Transcription ${id} non trouvée`);
    }

    return transcription;
  }

  async getVoiceStats(companyId: string): Promise<VoiceStats> {
    const transcriptions = await this.transcriptionRepository.find({
      where: { companyId },
    });

    const totalTranscriptions = transcriptions.length;

    if (totalTranscriptions === 0) {
      return {
        totalTranscriptions: 0,
        successRate: 0,
        avgConfidence: 0,
        mostUsedLanguage: 'fr-FR',
        byStatus: {},
        byLanguage: {},
      };
    }

    const confirmedOrMatched = transcriptions.filter(
      t => t.status === TranscriptionStatus.CONFIRMED || t.status === TranscriptionStatus.MATCHED
    );
    const successRate = Math.round((confirmedOrMatched.length / totalTranscriptions) * 100) / 100;

    const withConfidence = transcriptions.filter(t => t.overallConfidence !== null);
    const avgConfidence = withConfidence.length > 0
      ? withConfidence.reduce((sum, t) => sum + (t.overallConfidence || 0), 0) / withConfidence.length
      : 0;

    const languageCount: Record<string, number> = {};
    for (const t of transcriptions) {
      const lang = t.language || 'unknown';
      languageCount[lang] = (languageCount[lang] || 0) + 1;
    }
    const mostUsedLanguage = Object.entries(languageCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'fr-FR';

    const byStatus: Record<string, number> = {};
    for (const t of transcriptions) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    }

    const byLanguage: Record<string, number> = { ...languageCount };

    return {
      totalTranscriptions,
      successRate,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      mostUsedLanguage,
      byStatus,
      byLanguage,
    };
  }
}
