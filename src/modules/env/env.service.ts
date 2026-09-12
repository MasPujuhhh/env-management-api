import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { ApiKeyGuard } from '../api-keys/api-key.guard';
import { DecodeEnvDto } from './dto/decode.dto';

@UseGuards(ApiKeyGuard)
@Controller('env')
export class EnvController {
  constructor(
    private readonly db: PrismaService,
    private readonly enc: EncryptionService,
  ) {}

  private quote(value: string) {
    return /[\s#='"\\]/.test(value) ? JSON.stringify(value) : value;
  }

  /**
   * GET /env/:repository
   *
   * Flow:
   *
   * Secret DB
   *   ↓
   * decrypt encryptedValue
   *   ↓
   * generate .env
   *   ↓
   * AES-256-GCM encrypt
   *   ↓
   * encrypted payload
   */
  @Get(':repository')
  async get(@Param('repository') slug: string, @Req() r: any) {
    const repo = await this.db.repository.findFirst({
      where: {
        slug,
      },
    });

    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    if (r.apiKey.repositoryId !== repo.id) {
      throw new NotFoundException('Repository not found');
    }

    const rows = await this.db.secret.findMany({
      where: {
        repositoryId: repo.id,
        type: 'SECRET',
      },
      orderBy: {
        key: 'asc',
      },
    });

    const data = rows
      .map((secret) => {
        if (!secret.encryptedValue) {
          return null;
        }

        const value = secret.encryptedValue;

        return `${secret.key}=${this.quote(value)}`;
      })
      .filter((value): value is string => Boolean(value))
      .join('\n');

    const envContent = data ? `${data}\n` : '';

    /**
     * Encrypt seluruh .env menggunakan AES-256-GCM.
     *
     * Jangan Base64 lagi di sini.
     * EncryptionService.encrypt() sudah menghasilkan
     * Base64-safe encrypted payload.
     */
    const encryptedData = this.enc.encrypt(envContent);

    await this.db.apiKey.update({
      where: {
        id: r.apiKey.id,
      },
      data: {
        lastUsedAt: new Date(),
      },
    });

    return {
      repository: repo.slug,
      data: encryptedData,
    };
  }

  /**
   * POST /env/decode
   *
   * Dipakai untuk testing atau server/agent decoder.
   *
   * Request:
   * {
   *   "data": "v1...."
   * }
   *
   * Response:
   * {
   *   "data": "APP_NAME=KALA API\nAPP_PORT=8000\n"
   * }
   */
  @Post('decode')
  async decode(@Body() dto: DecodeEnvDto) {
    try {
      const data = this.enc.decrypt(dto.data);

      return {
        data,
      };
    } catch {
      throw new BadRequestException('Invalid encrypted environment payload');
    }
  }
}
