import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerateImageDto, ImageStyle, ImageDimensions } from '../dto/generate-image.dto';
import { StorageService } from '../../../shared/services/storage.service';

@Injectable()
export class AiImageGeneratorService {
  private readonly logger = new Logger(AiImageGeneratorService.name);
  private readonly openaiApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY', '');
  }

  async generateImage(dto: GenerateImageDto, companyProfile: any): Promise<{
    imageUrl: string;
    prompt: string;
  }> {
    const enhancedPrompt = this.buildEnhancedPrompt(dto, companyProfile);

    const dimensionMap: Record<string, string> = {
      square: '1024x1024',
      portrait: '1024x1792',
      landscape: '1792x1024',
      story: '1024x1792',
    };

    const size = dimensionMap[dto.dimensions] || '1024x1024';
    const imageFileName = `marketing/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

    if (!this.openaiApiKey) {
      const placeholderSvg = this.generatePlaceholderSvg(dto);
      const buffer = Buffer.from(placeholderSvg);
      const key = await this.storageService.uploadFile('marketing', buffer, `${Date.now()}-placeholder.svg`, 'image/svg+xml');

      return {
        imageUrl: key.startsWith('local/') ? key : await this.storageService.getSignedUrl(key),
        prompt: enhancedPrompt,
      };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: size,
          quality: 'standard',
        }),
      });

      if (!response.ok) {
        this.logger.error(`OpenAI image generation error: ${response.status}`);
        const placeholderSvg = this.generatePlaceholderSvg(dto);
        const buffer = Buffer.from(placeholderSvg);
        const key = await this.storageService.uploadFile('marketing', buffer, imageFileName, 'image/svg+xml');
        return {
          imageUrl: key.startsWith('local/') ? key : await this.storageService.getSignedUrl(key),
          prompt: enhancedPrompt,
        };
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;

      const imageResponse = await fetch(imageUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const key = await this.storageService.uploadFile('marketing', imageBuffer, imageFileName, 'image/png');

      return {
        imageUrl: await this.storageService.getSignedUrl(key),
        prompt: enhancedPrompt,
      };
    } catch (error) {
      this.logger.error(`Error generating image: ${error.message}`);
      const placeholderSvg = this.generatePlaceholderSvg(dto);
      const buffer = Buffer.from(placeholderSvg);
      const key = await this.storageService.uploadFile('marketing', buffer, imageFileName, 'image/svg+xml');
      return {
        imageUrl: key.startsWith('local/') ? key : await this.storageService.getSignedUrl(key),
        prompt: enhancedPrompt,
      };
    }
  }

  async generateProductImage(product: any, style: string): Promise<{
    imageUrl: string;
    prompt: string;
  }> {
    const prompt = `Professional product photography for "${product?.name || 'African product'}", ${style || 'vibrant'} style, clean white background, high quality, commercial photography, African market context`;

    const dto: GenerateImageDto = {
      prompt: product?.description || product?.name || 'Product showcase',
      style: this.mapStyle(style) as ImageStyle,
      dimensions: ImageDimensions.SQUARE,
      brandColors: product?.brandColors || ['#f59e0b', '#10b981'],
      includeLogo: false,
    };

    return this.generateImage({ ...dto, prompt }, { product });
  }

  async generatePromotionalBanner(product: any, offer: string, dimensions: string): Promise<{
    imageUrl: string;
    prompt: string;
  }> {
    const dimMap: Record<string, ImageDimensions> = {
      square: ImageDimensions.SQUARE,
      portrait: ImageDimensions.PORTRAIT,
      landscape: ImageDimensions.LANDSCAPE,
      story: ImageDimensions.STORY,
    };

    const prompt = `Eye-catching promotional banner for "${offer}", featuring ${product?.name || 'products'}, vibrant African design, bold text space, festive colors, professional marketing banner`;

    const dto: GenerateImageDto = {
      prompt: `Promotional banner: ${offer}`,
      style: ImageStyle.VIBRANT,
      dimensions: dimMap[dimensions] || ImageDimensions.LANDSCAPE,
      brandColors: ['#dc2626', '#f59e0b'],
      includeLogo: true,
    };

    return this.generateImage({ ...dto, prompt }, { product });
  }

  async generateSocialMediaKit(companyProfile: any): Promise<{
    profileBanner: string;
    postTemplate: string;
    storyTemplate: string;
  }> {
    const brandName = companyProfile?.name || 'Entreprise';
    const sector = companyProfile?.sector || 'Business';
    const brandColors = companyProfile?.brandColors || ['#f59e0b', '#10b981'];

    const bannerPrompt = `Professional social media banner for "${brandName}", ${sector} sector, African business, elegant design with ${brandColors.join(' and ')} colors, modern and clean, space for logo`;

    const bannerDto: GenerateImageDto = {
      prompt: bannerPrompt,
      style: ImageStyle.PROFESSIONAL,
      dimensions: ImageDimensions.LANDSCAPE,
      brandColors,
      includeLogo: false,
    };
    const banner = await this.generateImage(bannerDto, companyProfile);

    const postPrompt = `Social media post template for "${brandName}", ${sector}, African market, clean design, space for text and images, ${brandColors.join(' and ')} color scheme`;

    const postDto: GenerateImageDto = {
      prompt: postPrompt,
      style: ImageStyle.MINIMALIST,
      dimensions: ImageDimensions.SQUARE,
      brandColors,
      includeLogo: false,
    };
    const post = await this.generateImage(postDto, companyProfile);

    const storyPrompt = `Instagram/Facebook story template for "${brandName}", ${sector}, vertical format, engaging African design elements, ${brandColors.join(' and ')} colors, space for text overlay`;

    const storyDto: GenerateImageDto = {
      prompt: storyPrompt,
      style: ImageStyle.VIBRANT,
      dimensions: ImageDimensions.STORY,
      brandColors,
      includeLogo: false,
    };
    const story = await this.generateImage(storyDto, companyProfile);

    return {
      profileBanner: banner.imageUrl,
      postTemplate: post.imageUrl,
      storyTemplate: story.imageUrl,
    };
  }

  async generateFlyer(companyProfile: any, event: string, details: string): Promise<{
    imageUrl: string;
    prompt: string;
  }> {
    const prompt = `Professional event flyer for "${event}", ${details}, ${companyProfile?.name || 'Company'} branding, African design style, vibrant colors, clear text layout, festive and engaging`;

    const dto: GenerateImageDto = {
      prompt: `Event flyer: ${event} - ${details}`,
      style: ImageStyle.VIBRANT,
      dimensions: ImageDimensions.PORTRAIT,
      brandColors: ['#dc2626', '#f59e0b', '#10b981'],
      includeLogo: true,
    };

    return this.generateImage({ ...dto, prompt }, companyProfile);
  }

  private buildEnhancedPrompt(dto: GenerateImageDto, companyProfile: any): string {
    let prompt = dto.prompt;

    const styleEnhancements: Record<string, string> = {
      realistic: 'photorealistic, ultra detailed, professional photography',
      cartoon: 'cartoon illustration, colorful, playful style',
      minimalist: 'minimalist design, clean lines, simple composition',
      african: 'African art style, traditional patterns, warm earth tones, vibrant colors',
      vibrant: 'vibrant colors, dynamic composition, eye-catching design',
      professional: 'professional design, corporate style, clean and modern',
    };

    if (dto.style && styleEnhancements[dto.style]) {
      prompt += `. ${styleEnhancements[dto.style]}`;
    }

    if (dto.brandColors?.length) {
      prompt += `. Color palette: ${dto.brandColors.join(', ')}`;
    }

    if (dto.includeLogo && companyProfile?.name) {
      prompt += `. Include subtle "${companyProfile.name}" logo placement area`;
    }

    if (companyProfile?.sector) {
      prompt += `. Context: ${companyProfile.sector} business in West Africa`;
    }

    if (companyProfile?.name) {
      prompt += `. Brand: ${companyProfile.name}`;
    }

    return prompt + '. High quality, marketing-grade visual content.';
  }

  private mapStyle(style: string): any {
    const styleMap: Record<string, string> = {
      realistic: 'realistic',
      cartoon: 'cartoon',
      minimalist: 'minimalist',
      african: 'african',
      vibrant: 'vibrant',
      professional: 'professional',
    };
    return styleMap[style] || 'vibrant';
  }

  private generatePlaceholderSvg(dto: GenerateImageDto): string {
    const colors = dto.brandColors?.length ? dto.brandColors : ['#f59e0b', '#10b981'];
    const title = dto.prompt || 'Marketing Visual';

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors[1] || colors[0]};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad1)"/>
  <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" font-weight="bold">AURA OS</text>
  <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">${title.substring(0, 40)}</text>
  <text x="50%" y="65%" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle" opacity="0.8">Marketing Generator - Preview</text>
</svg>`;
  }
}
