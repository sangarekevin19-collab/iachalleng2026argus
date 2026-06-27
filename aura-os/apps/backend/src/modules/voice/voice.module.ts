import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoiceTranscription } from './entities/voice-transcription.entity';
import { VoiceRecognitionService } from './services/voice-recognition.service';
import { VoiceProcessorService } from './services/voice-processor.service';
import { VoiceController } from './voice.controller';
import { PosModule } from '../pos/pos.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VoiceTranscription]),
    PosModule,
    InventoryModule,
  ],
  controllers: [VoiceController],
  providers: [VoiceRecognitionService, VoiceProcessorService],
  exports: [VoiceRecognitionService, VoiceProcessorService],
})
export class VoiceModule {}
