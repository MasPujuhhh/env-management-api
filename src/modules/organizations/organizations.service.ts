import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createId } from '@paralleldrive/cuid2';
import { PrismaService } from '../database/prisma.service';
import { OrganizationDto, OrganizationMemberDto } from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly db: PrismaService) {}

  private async access(id: string, user: any, manager = false) {
    if (user.systemRole === 'SUPERADMIN') {
      const organization = await this.db.organization.findFirst({
        where: { id, deletedAt: null },
      });
      if (!organization) throw new NotFoundException('Organization not found');
      return organization;
    }
    const member = await this.db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: user.id,
        },
      },
      include: { organization: true },
    });

    console.log(manager)

    console.log(member);

    if (!member || member.organization.deletedAt)
      throw new ForbiddenException('Organization access denied');
    if (manager && member.role !== 'MANAGER')
      throw new ForbiddenException('Manager access required');
    return member.organization;
  }

  async list(user: any) {
    return this.db.organization.findMany({
      where:
        user.systemRole === 'SUPERADMIN'
          ? { deletedAt: null }
          : { deletedAt: null, members: { some: { userId: user.id } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: OrganizationDto, user: any) {
    if (user.systemRole !== 'SUPERADMIN') throw new ForbiddenException();
    try {
      const nextSlug = createId();
      return await this.db.organization.create({
        data: { ...dto, slug: nextSlug, createdBy: user.id },
      });
    } catch {
      throw new ConflictException('Organization slug already exists');
    }
  }

  async duplicate(id: string, user: any) {
    const source = await this.access(id, user, true);
    const copy = await this.db.organization.create({
      data: {
        name: `${source.name} Copy`,
        slug: createId(),
        description: source.description,
        createdBy: user.id,
      },
    });

    const workspaces = await this.db.workspace.findMany({
      where: { organizationId: id, deletedAt: null },
      include: {
        groups: {
          where: { deletedAt: null },
          include: { repositories: { where: { deletedAt: null }, include: { secrets: true } } },
        },
      },
    });

    for (const workspace of workspaces) {
      const createdWorkspace = await this.db.workspace.create({
        data: {
          organizationId: copy.id,
          name: `${workspace.name} Copy`,
          slug: createId(),
          description: workspace.description,
          createdBy: user.id,
        },
      });

      for (const group of workspace.groups) {
        const createdGroup = await this.db.repositoryGroup.create({
          data: {
            workspaceId: createdWorkspace.id,
            name: `${group.name} Copy`,
            slug: createId(),
            description: group.description,
            createdBy: user.id,
          },
        });

        for (const repository of group.repositories) {
          const createdRepo = await this.db.repository.create({
            data: {
              repositoryGroupId: createdGroup.id,
              name: `${repository.name} Copy`,
              slug: createId(),
              description: repository.description,
              createdBy: user.id,
            },
          });

          if (repository.secrets.length > 0) {
            await this.db.secret.createMany({
              data: repository.secrets.map((secret) => ({
                repositoryId: createdRepo.id,
                key: secret.key,
                value: secret.value,
                encryptedValue: secret.encryptedValue,
                type: secret.type,
                sortOrder: secret.sortOrder,
                description: secret.description,
                createdBy: user.id,
                updatedBy: user.id,
              })),
            });
          }
        }
      }
    }

    return copy;
  }

  async get(id: string, user: any) {
    const org =
      user.systemRole === 'SUPERADMIN'
        ? await this.db.organization.findFirst({ where: { id, deletedAt: null } })
        : await this.access(id, user);
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(id: string, dto: OrganizationDto, user: any) {
    await this.access(id, user, true);
    return this.db.organization.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: any) {
    await this.access(id, user, true);
    await this.db.organization.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  async members(id: string, user: any) {
    await this.access(id, user);
    return this.db.organizationMember.findMany({
      where: { organizationId: id },
      include: { user: { select: { id: true, name: true, email: true, systemRole: true } } },
    });
  }

  async assignableUsers(id: string, user: any) {
    await this.access(id, user, true);
    return this.db.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }

  async addMember(id: string, dto: OrganizationMemberDto, user: any) {
    await this.access(id, user, true);
    if (dto.role === 'MANAGER' && user.systemRole !== 'SUPERADMIN')
      throw new ForbiddenException('Only superadmin can create managers');
    try {
      return await this.db.$transaction(async (tx) => {
        const email = dto.email.toLowerCase();
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing?.deletedAt) throw new NotFoundException('User is deactivated');
        if (!existing && !dto.password)
          throw new BadRequestException('Password is required for new users');
        const created =
          existing ??
          (await tx.user.create({
            data: {
              name: dto.name,
              email,
              password: await bcrypt.hash(dto.password as string, 12),
              systemRole: 'USER',
            },
          }));
        return tx.organizationMember.create({
          data: { organizationId: id, userId: created.id, role: dto.role },
        });
      });
    } catch {
      throw new ConflictException('User or membership already exists');
    }
  }

  async removeMember(id: string, memberId: string, user: any) {
    await this.access(id, user, true);
    const result = await this.db.organizationMember.deleteMany({
      where: { id: memberId, organizationId: id },
    });
    if (!result.count) throw new NotFoundException('Organization member not found');
    return { success: true };
  }
}
