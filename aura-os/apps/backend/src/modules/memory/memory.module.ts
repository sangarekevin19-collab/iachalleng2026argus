import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoryEntry } from './entities/memory-entry.entity';
import { MemoryService } from './memory.service';
import { MemoryController } from './memory.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MemoryEntry])],
  controllers: [MemoryController],
  providers: [MemoryService],
  exports: [MemoryService, TypeOrmModule],
})
export class MemoryModule {}
