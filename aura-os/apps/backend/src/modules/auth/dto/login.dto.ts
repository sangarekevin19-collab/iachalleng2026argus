import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '+22673484312' })
  @IsString()
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis' })
  phone: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(4, { message: 'Le mot de passe doit contenir au moins 4 caractères' })
  @MaxLength(128, { message: 'Le mot de passe ne peut pas dépasser 128 caractères' })
  passcode: string;
}
