import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const workspaceSelect = {
  id: true,
  name: true,
  slug: true,
  organizationId: true,
} as const;

const groupSelect = {
  id: true,
  name: true,
  slug: true,
  workspaceId: true,
} as const;

const repoSelect = {
  id: true,
  name: true,
  slug: true,
  repositoryGroupId: true,
} as const;

/**
 * Single-request sidebar menu.
 *
 * Menggantikan waterfall N+1 di FE (organizations -> workspaces -> groups ->
 * repositories yang sequential). Seluruh tree diambil dalam 1 query nested
 * (SUPERADMIN) atau maksimal 3 query ringan paralel (membership + tree),
 * dengan field minimal yang memang dipakai sidebar (id/name/slug).
 */
@Injectable()
export class SidebarService {
  constructor(private readonly db: PrismaService) {}

  async getMenu(user: any, organizationId?: string) {
    if (user.systemRole === 'SUPERADMIN') {
      return this.db.organization.findMany({
        where: {
          deletedAt: null,
          ...(organizationId ? { id: organizationId } : {}),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          workspaces: {
            where: { deletedAt: null },
            orderBy: { name: 'asc' },
            select: {
              ...workspaceSelect,
              groups: {
                where: { deletedAt: null },
                orderBy: { name: 'asc' },
                select: {
                  ...groupSelect,
                  repositories: {
                    where: { deletedAt: null },
                    orderBy: { name: 'asc' },
                    select: repoSelect,
                  },
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    // Non-superadmin: bulk membership dulu (paralel), baru 1 nested tree query.
    const [orgMembers, wsMembers] = await Promise.all([
      this.db.organizationMember.findMany({
        where: { userId: user.id },
        select: {
          organizationId: true,
          role: true,
          organization: { select: { id: true, deletedAt: true } },
        },
      }),
      this.db.workspaceMember.findMany({
        where: { userId: user.id },
        select: { workspaceId: true },
      }),
    ]);

    const roleByOrg = new Map<string, string>();
    for (const m of orgMembers) {
      if (!m.organization || m.organization.deletedAt) continue;
      roleByOrg.set(m.organizationId, m.role);
    }

    let orgIds = [...roleByOrg.keys()];
    if (organizationId) {
      if (!roleByOrg.has(organizationId)) return [];
      orgIds = [organizationId];
    }
    if (orgIds.length === 0) return [];

    const wsSet = new Set(wsMembers.map((m) => m.workspaceId));

    const orgs = await this.db.organization.findMany({
      where: { id: { in: orgIds }, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        workspaces: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
          select: {
            ...workspaceSelect,
            groups: {
              where: { deletedAt: null },
              orderBy: { name: 'asc' },
              select: {
                ...groupSelect,
                repositories: {
                  where: { deletedAt: null },
                  orderBy: { name: 'asc' },
                  select: repoSelect,
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // USER hanya melihat workspace yang dia ikuti; MANAGER melihat semua.
    return orgs.map((org) => ({
      ...org,
      workspaces:
        roleByOrg.get(org.id) === 'MANAGER'
          ? org.workspaces
          : org.workspaces.filter((w) => wsSet.has(w.id)),
    }));
  }
}
