import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { RepositoryGroupDto } from './dto/repository-group.dto';

@Injectable()
export class RepositoryGroupsService {
  constructor(private readonly db: PrismaService) {}

  /**
   * Check Workspace Access
   */
  private async workspaceAccess(workspaceId: string, user: any, manager = false) {
    const workspace = await this.db.workspace.findFirst({
      where: {
        id: workspaceId,
        deletedAt: null,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    /**
     * SUPERADMIN
     * Full access
     */
    if (user.systemRole === 'SUPERADMIN') {
      return workspace;
    }

    /**
     * Check Organization Membership
     */
    const organizationMember = await this.db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: workspace.organizationId,
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
     * USER must be Workspace Member
     */
    if (organizationMember.role === 'USER') {
      const workspaceMember = await this.db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: user.id,
          },
        },
      });

      if (!workspaceMember) {
        throw new ForbiddenException('Workspace access denied');
      }
    }

    return workspace;
  }

  /**
   * Check Repository Group Access
   */
  private async repositoryGroupAccess(groupId: string, user: any, manager = false) {
    const group = await this.db.repositoryGroup.findFirst({
      where: {
        id: groupId,
        deletedAt: null,
      },
    });

    if (!group) {
      throw new NotFoundException('Repository group not found');
    }

    await this.workspaceAccess(group.workspaceId, user, manager);

    return group;
  }

  /**
   * Create Repository Group
   */
  async create(workspaceId: string, dto: RepositoryGroupDto, user: any) {
    await this.workspaceAccess(workspaceId, user, true);

    try {
      return await this.db.repositoryGroup.create({
        data: {
          ...dto,
          workspaceId,
          createdBy: user.id,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Repository group slug already exists in this workspace');
      }

      throw error;
    }
  }

  /**
   * List Repository Groups
   */
  async list(workspaceId: string, user: any) {
    await this.workspaceAccess(workspaceId, user);

    return this.db.repositoryGroup.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },

      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        _count: {
          select: {
            repositories: true,
          },
        },
      },

      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Repository Group Detail
   *
   * Optional, tapi saya rekomendasikan
   */
  async one(id: string, user: any) {
    await this.repositoryGroupAccess(id, user);

    return this.db.repositoryGroup.findUnique({
      where: {
        id,
      },

      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,

            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
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
            repositories: true,
          },
        },
      },
    });
  }

  /**
   * Update Repository Group
   */
  async update(id: string, dto: RepositoryGroupDto, user: any) {
    await this.repositoryGroupAccess(id, user, true);

    try {
      return await this.db.repositoryGroup.update({
        where: {
          id,
        },

        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Repository group slug already exists in this workspace');
      }

      throw error;
    }
  }

  /**
   * Soft Delete Repository Group
   */
  async remove(id: string, user: any) {
    const group = await this.repositoryGroupAccess(id, user, true);

    /**
     * Optional safety:
     * Jangan hapus group kalau masih punya repository aktif
     */
    const repositoryCount = await this.db.repository.count({
      where: {
        repositoryGroupId: group.id,
        deletedAt: null,
      },
    });

    if (repositoryCount > 0) {
      throw new ConflictException('Repository group still contains repositories');
    }

    await this.db.repositoryGroup.update({
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
