import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  async registerDevice(userId: string, deviceInfo: Record<string, any>): Promise<Device> {
    const existing = await this.deviceRepository.findOne({
      where: { userId, deviceId: deviceInfo.deviceId },
    });

    if (existing) {
      existing.lastUsedAt = new Date();
      existing.ipAddress = deviceInfo.ip;
      return this.deviceRepository.save(existing);
    }

    const device = this.deviceRepository.create({
      userId,
      deviceId: deviceInfo.deviceId || `device-${Date.now()}`,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      ipAddress: deviceInfo.ip,
      isTrusted: false,
      lastUsedAt: new Date(),
    });

    return this.deviceRepository.save(device);
  }

  async getUserDevices(userId: string): Promise<Device[]> {
    return this.deviceRepository.find({
      where: { userId, isBlocked: false },
      order: { lastUsedAt: 'DESC' },
    });
  }

  async trustDevice(userId: string, deviceId: string): Promise<void> {
    await this.deviceRepository.update({ userId, deviceId }, { isTrusted: true });
  }

  async blockDevice(userId: string, deviceId: string): Promise<void> {
    await this.deviceRepository.update({ userId, deviceId }, { isBlocked: true });
  }
}
