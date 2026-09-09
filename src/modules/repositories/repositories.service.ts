import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { PaginationDto } from '../common/pagination.dto';
import { RepositoryDto } from './dto/repository.dto';

@Injectable()
export class RepositoriesService {
  constructor(private readonly db: PrismaService) {}

  /**
   * Check access to Repository Group
   */
  private async repositoryGroupAccess(groupId: string, user: any, manager = false) {
    const group = await this.db.repositoryGroup.findFirst({
      where: {
        id: groupId,
        deletedAt: null,
      },
      include: {
        workspace: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Repository group not found');
    }

    /**
     * SUPERADMIN
     * Full access
     */
    if (user.systemRole === 'SUPERADMIN') {
      return group;
    }

    /**
     * Check Organization Membership
     */
    const organizationMember = await this.db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: group.workspace.organizationId,
          userId: user.id,
        },
      },
    });

    if (!organizationMember) {
      throw new ForbiddenException('Organization access denied');
    }

    /**
     * Manager-only access
     */
    if (manager && organizationMember.role !== 'MANAGER') {
      throw new ForbiddenException('Manager access required');
    }

    /**
     * USER must be a Workspace Member
     */
    if (organizationMember.role === 'USER') {
      const workspaceMember = await this.db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: group.workspaceId,
            userId: user.id,
          },
        },
      });

      if (!workspaceMember) {
        throw new ForbiddenException('Workspace access denied');
      }
    }

    return group;
  }

  /**
   * Check access to Repository
   */
  private async repositoryAccess(repositoryId: string, user: any, manager = false) {
    const repository = await this.db.repository.findFirst({
      where: {
        id: repositoryId,
        deletedAt: null,
      },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found');
    }

    await this.repositoryGroupAccess(repository.repositoryGroupId, user, manager);

    return repository;
  }

  /**
   * List Repository by Group
   */
  async listByGroup(groupId: string, user: any, p: PaginationDto) {
    await this.repositoryGroupAccess(groupId, user);

    const where: Prisma.RepositoryWhereInput = {
      repositoryGroupId: groupId,
      deletedAt: null,
    };

    const [items, total] = await this.db.$transaction([
      this.db.repository.findMany({
        where,
        include: {
          _count: {
            select: {
              secrets: true,
              apiKeys: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip: p.skip,
        take: p.limit,
      }),

      this.db.repository.count({
        where,
      }),
    ]);

    return {
      items,
      meta: {
        page: p.page,
        limit: p.limit,
        total,
        totalPages: Math.ceil(total / p.limit),
      },
    };
  }

  /**
   * Repository Detail
   */
  async one(id: string, user: any) {
    const repository = await this.repositoryAccess(id, user);

    return this.db.repository.findUnique({
      where: {
        id: repository.id,
      },
      include: {
        group: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                organizationId: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            secrets: true,
            apiKeys: true,
          },
        },
      },
    });
  }

  /**
   * Create Repository
   */
  async create(groupId: string, dto: RepositoryDto, user: any) {
    await this.repositoryGroupAccess(groupId, user, true);

    try {
      return await this.db.repository.create({
        data: {
          ...dto,

          repositoryGroupId: groupId,

          createdBy: user.id,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Repository slug already exists in this group');
      }

      throw error;
    }
  }

  /**
   * Update Repository
   */
  async update(id: string, dto: RepositoryDto, user: any) {
    await this.repositoryAccess(id, user, true);

    try {
      return await this.db.repository.update({
        where: {
          id,
        },
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Repository slug already exists in this group');
      }

      throw error;
    }
  }

  /**
   * Soft Delete Repository
   */
  async del(id: string, user: any) {
    await this.repositoryAccess(id, user, true);
    await this.db.repository.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
    };
  }
}
