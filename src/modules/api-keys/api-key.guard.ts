import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { createHash } from 'crypto';

const hash = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private db: PrismaService) {}
  async canActivate(c: ExecutionContext) {
    const req = c.switchToHttp().getRequest(),
      raw = req.headers['x-api-key'];
    if (typeof raw !== 'string') throw new UnauthorizedException('Invalid API key');
    const key = await this.db.apiKey.findFirst({
      where: { hashedKey: hash(raw) },
      include: { repository: true },
    });
    if (!key) throw new UnauthorizedException('Invalid API key');
    req.apiKey = key;
    return true;
  }
}
