import { IsString, IsArray, IsOptional, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmItemDto {
  @ApiProperty({ description: 'ID du produit' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Quantité' })
  quantity: number;

  @ApiPropertyOptional({ description: 'Confirmer cet article', default: true })
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean = true;
}

export class ConfirmVoiceSaleDto {
  @ApiProperty({ description: 'ID de la transcription vocale' })
  @IsString()
  transcriptionId: string;

  @ApiProperty({ description: 'Articles confirmés' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmItemDto)
  items: ConfirmItemDto[];

  @ApiPropertyOptional({ description: 'Nom du client' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Méthode de paiement' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
