import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WorkspaceDto } from './dto/workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly db: PrismaService) {}
  private async organizationRole(organizationId: string, userId: string) {
    return this.db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
  }

  private async workspaceAccess(id: string, user: any, manager = false) {
    const workspace = await this.db.workspace.findFirst({ where: { id, deletedAt: null } });
    if (!workspace) throw new NotFoundException('Workspace not found');
    if (user.systemRole === 'SUPERADMIN') return workspace;
    const orgMember = await this.organizationRole(workspace.organizationId, user.id);
    if (!orgMember) throw new ForbiddenException('Organization access denied');
    if (manager && orgMember.role !== 'MANAGER')
      throw new ForbiddenException('Manager access required');
    if (!manager && orgMember.role === 'USER') {
      const member = await this.db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId: user.id } },
      });
      if (!member) throw new ForbiddenException('Workspace access denied');
    }
    return workspace;
  }

  list(organizationId: string, user: any) {
    return this.organizationRole(organizationId, user.id).then(async (member) => {
      if (user.systemRole !== 'SUPERADMIN' && !member)
        throw new ForbiddenException('Organization access denied');
      return this.db.workspace.findMany({
        where: { organizationId, deletedAt: null },
        orderBy: { name: 'asc' },
      });
    });
  }

  async create(organizationId: string, dto: WorkspaceDto, user: any) {
    if (user.systemRole !== 'SUPERADMIN') {
      const member = await this.organizationRole(organizationId, user.id);
      if (!member || member.role !== 'MANAGER') {
        throw new ForbiddenException('Manager access required');
      }
    }

    try {
      return await this.db.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: {
            ...dto,
            organizationId,
            createdBy: user.id,
          },
        });

        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: user.id,
          },
        });

        return workspace;
      });
    } catch (error) {
      throw new ConflictException('Workspace slug already exists');
    }
  }

  get(id: string, user: any) {
    return this.workspaceAccess(id, user);
  }

  async update(id: string, dto: WorkspaceDto, user: any) {
    await this.workspaceAccess(id, user, true);
    return this.db.workspace.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: any) {
    await this.workspaceAccess(id, user, true);
    await this.db.workspace.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  async members(id: string, user: any) {
    await this.workspaceAccess(id, user);
    return this.db.workspaceMember.findMany({
      where: { workspaceId: id },
      include: { user: { select: { id: true, name: true, email: true, systemRole: true } } },
    });
  }

  async addMember(id: string, userId: string, user: any) {
    const workspace = await this.workspaceAccess(id, user, true);
    const orgMember = await this.organizationRole(workspace.organizationId, userId);
    if (!orgMember) throw new ConflictException('User must belong to the organization first');
    try {
      return await this.db.workspaceMember.create({ data: { workspaceId: id, userId } });
    } catch {
      throw new ConflictException('Workspace membership already exists');
    }
  }

  async removeMember(id: string, memberId: string, user: any) {
    await this.workspaceAccess(id, user, true);
    const result = await this.db.workspaceMember.deleteMany({
      where: { id: memberId, workspaceId: id },
    });
    if (!result.count) throw new NotFoundException('Workspace member not found');
    return { success: true };
  }
}
