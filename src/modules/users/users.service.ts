import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const publicUser = {
  id: true,
  name: true,
  email: true,
  systemRole: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly db: PrismaService) {}

  private ensureSuperadmin(user: any) {
    if (user.systemRole !== 'SUPERADMIN') {
      throw new ForbiddenException('Only superadmin can manage users globally');
    }
  }

  async list(user: any) {
    this.ensureSuperadmin(user);
    return this.db.user.findMany({
      where: { deletedAt: null },
      select: publicUser,
      orderBy: { createdAt: 'desc' },
    });
  }

  async accessOverview(actor: any) {
    if (actor.systemRole === 'SUPERADMIN') {
      return this.db.organization.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        include: {
          workspaces: {
            where: { deletedAt: null },
            orderBy: { name: 'asc' },
            include: {
              groups: {
                where: { deletedAt: null },
                orderBy: { name: 'asc' },
                include: {
                  repositories: {
                    where: { deletedAt: null },
                    orderBy: { name: 'asc' },
                  },
                },
              },
            },
          },
        },
      });
    }

    const organizations = await this.db.organization.findMany({
      where: {
        deletedAt: null,
        members: { some: { userId: actor.id } },
      },
      orderBy: { name: 'asc' },
      include: {
        workspaces: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
          include: {
            groups: {
              where: { deletedAt: null },
              orderBy: { name: 'asc' },
              include: {
                repositories: {
                  where: { deletedAt: null },
                  orderBy: { name: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    return organizations.filter((organization) => {
      const validWorkspaces = organization.workspaces.filter((workspace) => {
        const validGroups = workspace.groups.filter((group) =>
          group.repositories.length >= 0,
        );
        return validGroups.length >= 0;
      });
      return validWorkspaces.length >= 0;
    });
  }

  async get(id: string, actor: any) {
    if (actor.systemRole !== 'SUPERADMIN' && actor.id !== id) {
      throw new ForbiddenException('User access denied');
    }
    const result = await this.db.user.findFirst({
      where: { id, deletedAt: null },
      select: publicUser,
    });
    if (!result) throw new NotFoundException('User not found');
    return result;
  }

  async create(dto: CreateUserDto, actor: any) {
    const organization = await this.db.organization.findFirst({
      where: { id: dto.organizationId, deletedAt: null },
    });
    if (!organization) throw new NotFoundException('Organization not found');
    const membership = await this.db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: dto.organizationId,
          userId: actor.id,
        },
      },
    });
    
    if (
      actor.systemRole !== 'SUPERADMIN' &&
      (!membership || membership.role !== 'MANAGER')
    ) {
      throw new ForbiddenException('Manager access required');
    }

    if (actor.systemRole !== 'SUPERADMIN' && dto.role !== 'USER') {
      throw new ForbiddenException('Managers can only create users');
    }

    try {
      return await this.db.$transaction(async (tx) => {
        const email = dto.email.toLowerCase();
        const existing = await tx.user.findUnique({ where: { email } });
        const created =
          existing ??
          (await tx.user.create({
            data: {
              name: dto.name,
              email,
              password: await bcrypt.hash(dto.password, 12),
              systemRole: 'USER',
            },
            select: publicUser,
          }));
        if (existing?.deletedAt) {
          throw new NotFoundException('User is deactivated');
        }
        const member = await tx.organizationMember.create({
          data: {
            organizationId: dto.organizationId,
            userId: created.id,
            role: dto.role,
          },
        });
        return {
          ...created,
          organizationId: member.organizationId,
          role: member.role,
        };
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Email is already in use');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto, actor: any) {
    if (actor.systemRole !== 'SUPERADMIN' && actor.id !== id) {
      throw new ForbiddenException('User access denied');
    }
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email.toLowerCase();
    if (dto.password !== undefined) data.password = await bcrypt.hash(dto.password, 12);
    try {
      return await this.db.user.update({
        where: { id },
        data,
        select: publicUser,
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Email is already in use');
      }
      throw error;
    }
  }

  async remove(id: string, actor: any) {
    this.ensureSuperadmin(actor);
    const result = await this.db.user.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('User not found');
    return { success: true };
  }
}
