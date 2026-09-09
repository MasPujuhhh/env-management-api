import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { ApiKeyDto } from './dto/api-key.dto';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class ApiKeysService {
  constructor(private readonly db: PrismaService) {}

  private async repo(repositoryId: string, user: any, manager = false) {
    const repository = await this.db.repository.findFirst({
      where: {
        id: repositoryId,
        deletedAt: null,
      },

      include: {
        group: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found');
    }

    if (user.systemRole === 'SUPERADMIN') {
      return repository;
    }

    const organizationMember = await this.db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: repository.group.workspace.organizationId,

          userId: user.id,
        },
      },
    });

    if (!organizationMember) {
      throw new ForbiddenException('Organization access denied');
    }

    if (manager && organizationMember.role !== 'MANAGER') {
      throw new ForbiddenException('Manager access required');
    }

    if (organizationMember.role === 'USER') {
      const workspaceMember = await this.db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: repository.group.workspaceId,

            userId: user.id,
          },
        },
      });
      if (!workspaceMember) {
        throw new ForbiddenException('Workspace access denied');
      }
    }
    return repository;
  }

  async list(repositoryId: string, user: any) {
    await this.repo(repositoryId, user);
    return this.db.apiKey.findMany({
      where: {
        repositoryId,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(repositoryId: string, dto: ApiKeyDto, user: any) {
    await this.repo(repositoryId, user, true);

    const existing = await this.db.apiKey.findFirst({
      where: {
        repositoryId,
      },
    });

    if (existing) {
      throw new ConflictException('Repository already has an active API key');
    }

    const raw = 'x-api-' + randomBytes(32).toString('hex');

    try {
      const apiKey = await this.db.apiKey.create({
        data: {
          repositoryId,
          name: dto.name,
          keyPrefix: raw.slice(0, 12),
          hashedKey: hash(raw),
          createdBy: user.id,
        },

        select: {
          id: true,
          name: true,
          keyPrefix: true,
          createdAt: true,
        },
      });

      return {
        ...apiKey,
        key: raw,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('API key already exists');
      }

      throw error;
    }
  }

  async revoke(repositoryId: string, keyId: string, user: any) {
    await this.repo(repositoryId, user, true);

    const result = await this.db.apiKey.delete({
      where: {
        id: keyId,
        repositoryId,
      },
    });

    return {
      success: true,
    };
  }
}
