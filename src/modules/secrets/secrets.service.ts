import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/encryption.service';

import { SecretDto } from './dto/secret.dto';
import { SyncSecretsDto } from './dto/sync-secrets.dto';

import { parseEnv } from './env.parser';

@Injectable()
export class SecretsService {
  constructor(
    private readonly db: PrismaService,
    private readonly enc: EncryptionService,
  ) {}

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

  async list(repositoryId: string, user: any, types?: string[]) {
    await this.repo(repositoryId, user);

    console.log(types)

    const secrets = await this.db.secret.findMany({
      where: {
        repositoryId,
        ...(types?.length && {
          type: {
            in: types,
          },
        }),
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        key: true,
        value: true,
        encryptedValue: true,
        type: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return secrets.map((secret) => ({
      id: secret.id,
      type: secret.type,
      key: secret.key,
      value: secret.type === 'SECRET' ? secret.encryptedValue : secret.value,
      sortOrder: secret.sortOrder,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
    }));
  }

  async add(repositoryId: string, dto: SecretDto, user: any) {
    await this.repo(repositoryId, user, true);

    const validKey = /^[A-Za-z_][A-Za-z0-9_]*$/;
    if (!validKey.test(dto.key)) {
      throw new BadRequestException('Invalid environment variable key');
    }

    const lastSecret = await this.db.secret.findFirst({
      where: {
        repositoryId,
      },
      orderBy: {
        sortOrder: 'desc',
      },
    });

    const sortOrder = lastSecret ? lastSecret.sortOrder + 1 : 0;

    try {
      return await this.db.secret.create({
        data: {
          repositoryId,
          key: dto.key,
          encryptedValue: dto.value,
          value: null,
          type: 'SECRET',
          sortOrder,
          createdBy: user.id,
          updatedBy: user.id,
        },
        select: {
          id: true,
          key: true,
          type: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Secret key already exists');
      }

      throw error;
    }
  }

  async edit(repositoryId: string, secretId: string, dto: SecretDto, user: any) {
    await this.repo(repositoryId, user, true);

    const secret = await this.db.secret.findFirst({
      where: {
        id: secretId,
        repositoryId,
      },
    });

    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    if (secret.type !== 'SECRET') {
      throw new BadRequestException('Only SECRET type can be edited');
    }

    const validKey = /^[A-Za-z_][A-Za-z0-9_]*$/;

    if (!dto.key || !validKey.test(dto.key)) {
      throw new BadRequestException('Invalid environment variable key');
    }

    try {
      return await this.db.secret.update({
        where: {
          id: secretId,
        },
        data: {
          key: dto.key,
          encryptedValue: dto.value,
          updatedBy: user.id,
        },
        select: {
          id: true,
          key: true,
          type: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Secret key already exists');
      }

      throw error;
    }
  }

  async sync(repositoryId: string, dto: SyncSecretsDto, user: any) {
    await this.repo(repositoryId, user, true);

    let parsed;

    try {
      parsed = parseEnv(dto.content);
    } catch (error) {
      throw new BadRequestException('Invalid ENV format');
    }

    let created = 0;
    let updated = 0;
    let deleted = 0;
    let unchanged = 0;

    await this.db.$transaction(async (tx) => {
      const result = await tx.secret.deleteMany({
        where: {
          repositoryId,
        },
      });

      deleted = result.count;

      for (const item of parsed) {
        if (item.type === 'SECRET') {
          await tx.secret.create({
            data: {
              repositoryId,
              key: item.key,
              encryptedValue: item.value,
              value: null,
              type: 'SECRET',
              sortOrder: item.sortOrder,
              createdBy: user.id,
              updatedBy: user.id,
            },
          });

          created++;
          continue;
        }

        if (item.type === 'COMMENT') {
          await tx.secret.create({
            data: {
              repositoryId,
              key: null,
              encryptedValue: null,
              value: item.value,
              type: 'COMMENT',
              sortOrder: item.sortOrder,
              createdBy: user.id,
              updatedBy: user.id,
            },
          });

          created++;
          continue;
        }

        if (item.type === 'EMPTY') {
          await tx.secret.create({
            data: {
              repositoryId,
              key: null,
              encryptedValue: null,
              value: item.value,
              type: 'EMPTY',
              sortOrder: item.sortOrder,
              createdBy: user.id,
              updatedBy: user.id,
            },
          });

          created++;
        }
      }
    });

    return {
      total: parsed.length,
      created,
      updated,
      deleted,
      unchanged,
    };
  }

  async del(repositoryId: string, secretId: string, user: any) {
    await this.repo(repositoryId, user, true);
    const result = await this.db.secret.deleteMany({
      where: {
        id: secretId,
        repositoryId,
      },
    });

    if (!result.count) {
      throw new NotFoundException('Secret not found');
    }

    return {
      success: true,
    };
  }
}
