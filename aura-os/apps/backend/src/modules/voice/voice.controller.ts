import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VoiceProcessorService } from './services/voice-processor.service';
import { VoiceRecognitionService } from './services/voice-recognition.service';
import { ProcessVoiceDto } from './dto/process-voice.dto';
import { ConfirmVoiceSaleDto } from './dto/confirm-voice-sale.dto';

@ApiTags('voice')
@Controller('voice')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VoiceController {
  constructor(
    private readonly voiceProcessorService: VoiceProcessorService,
    private readonly voiceRecognitionService: VoiceRecognitionService,
  ) {}

  @Post('process')
  @ApiOperation({ summary: 'Processer un enregistrement vocal et extraire les articles' })
  async processVoice(@Req() req: any, @Body() dto: ProcessVoiceDto) {
    return this.voiceProcessorService.processVoiceSale(
      dto.audioBase64,
      req.user.companyId,
      req.user.id,
      dto.language || 'fr-FR',
    );
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirmer une vente vocale et créer la vente' })
  async confirmVoiceSale(@Req() req: any, @Body() dto: ConfirmVoiceSaleDto) {
    return this.voiceProcessorService.confirmVoiceSale(
      dto,
      req.user.companyId,
      req.user.id,
    );
  }

  @Get('transcriptions')
  @ApiOperation({ summary: 'Liste des transcriptions vocales' })
  async getTranscriptions(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.voiceProcessorService.getTranscriptionHistory(
      req.user.companyId,
      page || 1,
      limit || 20,
    );
  }

  @Get('transcriptions/:id')
  @ApiOperation({ summary: 'Détail d\'une transcription vocale' })
  async getTranscription(@Req() req: any, @Param('id') id: string) {
    return this.voiceProcessorService.getTranscriptionById(id, req.user.companyId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques d\'utilisation vocale' })
  async getVoiceStats(@Req() req: any) {
    return this.voiceProcessorService.getVoiceStats(req.user.companyId);
  }

  @Get('supported-languages')
  @ApiOperation({ summary: 'Langues supportées pour la reconnaissance vocale' })
  async getSupportedLanguages() {
    return this.voiceRecognitionService.getSupportedLanguages();
  }
}
