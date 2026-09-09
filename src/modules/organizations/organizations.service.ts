import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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
      return await this.db.organization.create({ data: { ...dto, createdBy: user.id } });
    } catch {
      throw new ConflictException('Organization slug already exists');
    }
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

  async addMember(id: string, dto: OrganizationMemberDto, user: any) {
    await this.access(id, user, true);
    if (dto.role === 'MANAGER' && user.systemRole !== 'SUPERADMIN')
      throw new ForbiddenException('Only superadmin can create managers');
    try {
      return await this.db.$transaction(async (tx) => {
        const email = dto.email.toLowerCase();
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing?.deletedAt) throw new NotFoundException('User is deactivated');
        const created =
          existing ??
          (await tx.user.create({
            data: {
              name: dto.name,
              email,
              password: await bcrypt.hash(dto.password, 12),
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
}
