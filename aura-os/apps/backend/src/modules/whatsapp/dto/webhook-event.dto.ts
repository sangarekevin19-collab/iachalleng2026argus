import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class WebhookMessageDto {
  @IsNotEmpty()
  @IsString()
  from: string;

  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  timestamp: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsOptional()
  @IsObject()
  text?: { body: string };

  @IsOptional()
  @IsObject()
  image?: { id: string; caption?: string };

  @IsOptional()
  @IsObject()
  document?: { id: string; filename?: string; caption?: string };

  @IsOptional()
  @IsObject()
  interactive?: Record<string, any>;
}

export class WebhookStatusDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  status: string;

  @IsNotEmpty()
  @IsString()
  timestamp: string;

  @IsOptional()
  @IsString()
  recipientId?: string;
}

export class WebhookEventDto {
  @IsNotEmpty()
  @IsString()
  object: string;

  @IsNotEmpty()
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: WebhookMessageDto[];
        statuses?: WebhookStatusDto[];
      };
      field: string;
    }>;
  }>;
}
