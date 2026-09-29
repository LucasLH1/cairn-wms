import { randomUUID } from 'node:crypto';
import type { Permission, RoleNature } from '@cairn/contrat';
import { afterAll, describe, expect, it } from 'vitest';
import { openApplicationDatabase } from '../../test-support/database.js';
import { createSite } from '../../test-support/fixtures.js';
import { authorize, effectivePermissions, visibleSiteIds } from './index.js';

const db = openApplicationDatabase();
afterAll(async () => {
  await db.destroy();
});

async function role(nature: RoleNature, permissions: readonly Permission[]): Promise<string> {
  const created = await db
    .insertInto('foundation.role')
    .values({ name: `Rôle ${randomUUID()}`, nature })
    .returning('id')
    .executeTakeFirstOrThrow();
  if (permissions.length > 0) {
    await db
      .insertInto('foundation.rolePermission')
      .values(permissions.map((permission) => ({ roleId: created.id, permission })))
      .execute();
  }
  return created.id;
}

async function user(options: {
  roles: readonly string[];
  reportsTo?: string;
  sites?: readonly { id: string; execution: boolean }[];
}): Promise<string> {
  const created = await db
    .insertInto('foundation.user')
    .values({
      loginName: `u-${randomUUID()}`,
      displayName: 'Test',
      passwordHash: 'scrypt$1$1$1$x$y',
      reportsToUserId: options.reportsTo ?? null,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  for (const roleId of options.roles)
    await db.insertInto('foundation.userRole').values({ userId: created.id, roleId }).execute();
  for (const site of options.sites ?? []) {
    await db
      .insertInto('foundation.userSite')
      .values({ userId: created.id, siteId: site.id, execution: site.execution })
      .execute();
  }
  return created.id;
}

describe('héritage des droits par la hiérarchie (RG-SUR-022 à 025)', () => {
  it("transmet à l'encadrant opérationnel les droits d'exécution des rôles opérationnels encadrés", async () => {
    const lead = await user({ roles: [await role('operational', [])] });
    await user({ roles: [await role('operational', ['openInboundArrival'])], reportsTo: lead });
    expect(await effectivePermissions(db, lead)).toContain('openInboundArrival');
  });

  it("ne transmet rien à un encadrant qui ne tient qu'un rôle administratif (RG-SUR-024)", async () => {
    const manager = await user({ roles: [await role('administrative', [])] });
    await user({ roles: [await role('operational', ['openInboundArrival'])], reportsTo: manager });
    expect(await effectivePermissions(db, manager)).not.toContain('openInboundArrival');
  });

  it('ne franchit pas un rôle administratif, et ne remonte jamais (RG-SUR-025)', async () => {
    const top = await user({ roles: [await role('operational', [])] });
    const middle = await user({ roles: [await role('administrative', [])], reportsTo: top });
    const bottom = await user({
      roles: [await role('operational', ['createExpectedReceipt'])],
      reportsTo: middle,
    });
    expect(await effectivePermissions(db, top)).not.toContain('createExpectedReceipt');
    const upward = await user({ roles: [await role('operational', ['openInboundArrival'])] });
    await db.updateTable('foundation.user').set({ reportsToUserId: upward }).where('id', '=', top).execute();
    expect(await effectivePermissions(db, bottom)).not.toContain('openInboundArrival');
  });

  it('étend la visibilité à ce que voient les encadrés, sur tous les sites (RG-SUR-020, 021)', async () => {
    const [siteA, siteB] = [await createSite(db), await createSite(db)];
    const lead = await user({ roles: [], sites: [{ id: siteA, execution: true }] });
    const middle = await user({ roles: [], reportsTo: lead, sites: [] });
    await user({ roles: [], reportsTo: middle, sites: [{ id: siteB, execution: true }] });
    expect(await visibleSiteIds(db, lead)).toEqual(expect.arrayContaining([siteA, siteB]));
  });

  it("borne l'exécution aux sites déclarés, droit hérité compris (RG-SUR-026, 027)", async () => {
    const [own, other] = [await createSite(db), await createSite(db)];
    const lead = await user({
      roles: [await role('operational', [])],
      sites: [{ id: own, execution: true }],
    });
    await user({
      roles: [await role('operational', ['openInboundArrival'])],
      reportsTo: lead,
      sites: [{ id: other, execution: true }],
    });
    const decide = (siteId: string) =>
      db
        .transaction()
        .execute((transaction) => authorize(transaction, lead, 'openInboundArrival', { siteId }));
    expect(await decide(own)).toBeUndefined();
    expect(await decide(other)).toBe('outOfScope');
  });
});
