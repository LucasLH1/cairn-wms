import {
  getPrincipal,
  getPrincipalRestrictions,
  getSite,
  listPrincipalsForAdministration,
  listSites,
  postalAddressSchema,
  savePrincipal,
  saveSite,
  saveZone,
  setPrincipalActive,
  setPrincipalRestrictions,
  setSiteActive,
  setZoneActive,
  zoneCohabitationSchema,
  zonePurposeSchema,
  type PostalAddress,
} from '@cairn/contrat';
import { sql } from 'kysely';
import { z } from 'zod';
import type { DatabaseTransaction } from '../../socle/database/index.js';
import { defineGestureHandler, GestureRefusal, type RefusalDetails } from '../../socle/gesture/index.js';
import { defineQueryHandler, QueryRefusal } from '../../socle/query/index.js';
import { signalChange } from '../../socle/signal/index.js';
import { defineTraceEventType } from '../../socle/trace-event/index.js';

/** Décompte de ce qui reste à solder, par nature : flux en cours, stock (RG-ORG-009, 013). */
export type RemainingActivity = Readonly<Record<string, number>>;

/**
 * Ce que les autres modules logistiques déclarent de l'activité d'un site, d'un donneur d'ordre, d'une
 * zone. L'organisation ne les importe pas : ils lui sont remis au branchement de l'application.
 */
export interface OrganizationActivity {
  /** Flux en cours et stock sur le site : ce qui interdit de le désactiver. */
  readonly openOnSite: (transaction: DatabaseTransaction, siteId: string) => Promise<RemainingActivity>;
  /** Vrai si un flux, même clos, a déjà concerné le site : son code ne change plus. */
  readonly siteHasHistory: (transaction: DatabaseTransaction, siteId: string) => Promise<boolean>;
  /** Flux en cours et stock du donneur d'ordre. */
  readonly openForPrincipal: (
    transaction: DatabaseTransaction,
    principalId: string,
  ) => Promise<RemainingActivity>;
  /** Stock porté par la zone. */
  readonly stockInZone: (transaction: DatabaseTransaction, zoneId: string) => Promise<RemainingActivity>;
  /** Stock de la zone appartenant à d'autres donneurs d'ordre que celui-ci. */
  readonly foreignStockInZone: (
    transaction: DatabaseTransaction,
    zoneId: string,
    principalId: string,
  ) => Promise<RemainingActivity>;
}

const nothingRemains = (activity: RemainingActivity) => Object.values(activity).every((count) => count === 0);
const details = (activity: RemainingActivity): RefusalDetails =>
  Object.fromEntries(Object.entries(activity).filter(([, count]) => count > 0));

function addressColumns(address: PostalAddress | null) {
  return {
    addressLine1: address?.line1 ?? null,
    addressLine2: address?.line2 ?? null,
    postalCode: address?.postalCode ?? null,
    city: address?.city ?? null,
  };
}

function addressOf(row: {
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string | null;
}): PostalAddress | null {
  const parsed = postalAddressSchema.safeParse({
    line1: row.addressLine1,
    line2: row.addressLine2,
    postalCode: row.postalCode,
    city: row.city,
    countryCode: row.countryCode,
  });
  return parsed.success ? parsed.data : null;
}

const isTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
};

export const SITE = 'Site';
export const ZONE = 'Zone';
export const PRINCIPAL = 'Principal';

export const siteSavedEvent = defineTraceEventType(
  'siteSaved',
  z.object({ code: z.string(), name: z.string(), timeZone: z.string(), city: z.string() }),
);
export const siteActivationEvent = defineTraceEventType(
  'siteActivationChanged',
  z.object({ active: z.boolean() }),
);
export const zoneSavedEvent = defineTraceEventType(
  'zoneSaved',
  z.object({
    siteId: z.string(),
    code: z.string(),
    name: z.string(),
    purpose: z.string(),
    cohabitation: z.string(),
    principalId: z.string().nullable(),
  }),
);
export const zoneActivationEvent = defineTraceEventType(
  'zoneActivationChanged',
  z.object({ active: z.boolean() }),
);
export const principalSavedEvent = defineTraceEventType(
  'principalSaved',
  z.object({ code: z.string(), name: z.string(), group: z.string().nullable() }),
);
export const principalActivationEvent = defineTraceEventType(
  'principalActivationChanged',
  z.object({ active: z.boolean() }),
);
export const principalRestrictionsSetEvent = defineTraceEventType(
  'principalRestrictionsSet',
  z.object({ principalIds: z.array(z.string()) }),
);

/** Gestes et consultations d'administration de l'organisation (0.1 § 4, § 6). */
export function organizationAdministration(activity: OrganizationActivity) {
  const listSitesHandler = defineQueryHandler({
    definition: listSites,
    permissions: ['administerSites'],
    async execute({ db }) {
      const sites = await db
        .selectFrom('foundation.site as site')
        .select([
          'site.id',
          'site.code',
          'site.name',
          'site.city',
          'site.active',
          sql<number>`(select count(*)::int from logistics.zone zone where zone.site_id = site.id)`.as(
            'zoneCount',
          ),
        ])
        .orderBy('site.code')
        .execute();
      return { sites };
    },
  });

  const getSiteHandler = defineQueryHandler({
    definition: getSite,
    permissions: ['administerSites'],
    async execute({ db, input }) {
      const site = await db
        .selectFrom('foundation.site')
        .selectAll()
        .where('id', '=', input.siteId)
        .executeTakeFirst();
      if (site === undefined) throw new QueryRefusal('outOfScope');
      const [ranges, closures, zones, codeLocked] = await Promise.all([
        db
          .selectFrom('foundation.siteOpeningRange')
          .select(['weekday', 'opensAt', 'closesAt'])
          .where('siteId', '=', site.id)
          .orderBy('weekday')
          .orderBy('opensAt')
          .execute(),
        db
          .selectFrom('foundation.siteClosure')
          .select(['day', 'kind', 'label'])
          .where('siteId', '=', site.id)
          .orderBy('day')
          .execute(),
        db
          .selectFrom('logistics.zone')
          .select(['id', 'code', 'name', 'purpose', 'cohabitation', 'principalId', 'active'])
          .where('siteId', '=', site.id)
          .orderBy('code')
          .execute(),
        db.transaction().execute((transaction) => activity.siteHasHistory(transaction, site.id)),
      ]);
      const address = addressOf(site);
      const activeZones = zones.filter((zone) => zone.active);
      return {
        site: {
          id: site.id,
          code: site.code,
          name: site.name,
          timeZone: site.timeZone,
          address,
          active: site.active,
          codeEditable: !codeLocked,
          openingRanges: ranges.map((range) => ({
            weekday: range.weekday,
            opensAt: range.opensAt.slice(0, 5),
            closesAt: range.closesAt.slice(0, 5),
          })),
          closures: closures.map((closure) => ({
            day: closure.day,
            kind: closure.kind === 'publicHoliday' ? ('publicHoliday' as const) : ('exceptional' as const),
            label: closure.label,
          })),
          zones: zones.map((zone) => ({
            ...zone,
            purpose: zonePurposeSchema.parse(zone.purpose),
            cohabitation: zoneCohabitationSchema.parse(zone.cohabitation),
          })),
          missingForActivation: [
            ...(address === null ? (['address'] as const) : []),
            ...(activeZones.length === 0 ? (['zone'] as const) : []),
          ],
        },
      };
    },
  });

  /** Fiche site : code, libellé, fuseau, adresse (RG-ORG-002). Le code se fige dès la première activité. */
  const saveSiteHandler = defineGestureHandler({
    definition: saveSite,
    async execute({ transaction, input, appendEvent }) {
      if (!isTimeZone(input.timeZone)) throw new GestureRefusal('unknownTimeZone');
      const taken = await transaction
        .selectFrom('foundation.site')
        .select('id')
        .where('code', '=', input.code)
        .$if(input.siteId !== null, (query) => query.where('id', '<>', input.siteId ?? ''))
        .executeTakeFirst();
      if (taken !== undefined) throw new GestureRefusal('codeTaken');
      const values = {
        code: input.code,
        name: input.name,
        timeZone: input.timeZone,
        ...addressColumns(input.address),
        countryCode: input.address.countryCode,
      };
      let siteId = input.siteId;
      if (siteId === null) {
        siteId = (
          await transaction
            .insertInto('foundation.site')
            .values(values)
            .returning('id')
            .executeTakeFirstOrThrow()
        ).id;
      } else {
        const current = await transaction
          .selectFrom('foundation.site')
          .select('code')
          .where('id', '=', siteId)
          .executeTakeFirst();
        if (current === undefined) throw new GestureRefusal('unknownSite');
        if (current.code !== input.code && (await activity.siteHasHistory(transaction, siteId))) {
          throw new GestureRefusal('codeLocked');
        }
        await transaction.updateTable('foundation.site').set(values).where('id', '=', siteId).execute();
      }
      await appendEvent({
        eventType: siteSavedEvent,
        data: { code: input.code, name: input.name, timeZone: input.timeZone, city: input.address.city },
        objects: [{ type: SITE, id: siteId }],
      });
      await signalChange(transaction, { objectType: SITE, objectId: siteId, version: 1 });
      return { siteId };
    },
  });

  /**
   * Un site s'active avec une adresse et au moins une zone (parcours « Créer un site »). Il ne se
   * désactive pas tant qu'il porte du stock ou un flux en cours (RG-ORG-009).
   */
  const setSiteActiveHandler = defineGestureHandler({
    definition: setSiteActive,
    async execute({ transaction, input, appendEvent }) {
      const site = await transaction
        .selectFrom('foundation.site')
        .selectAll()
        .where('id', '=', input.siteId)
        .executeTakeFirst();
      if (site === undefined) throw new GestureRefusal('unknownSite');
      if (input.active) {
        const zone = await transaction
          .selectFrom('logistics.zone')
          .select('id')
          .where('siteId', '=', site.id)
          .where('active', '=', true)
          .executeTakeFirst();
        const missing = [
          ...(addressOf(site) === null ? ['address'] : []),
          ...(zone === undefined ? ['zone'] : []),
        ];
        if (missing.length > 0)
          throw new GestureRefusal('activationIncomplete', { missing: missing.join(',') });
      } else {
        const remaining = await activity.openOnSite(transaction, site.id);
        if (!nothingRemains(remaining)) throw new GestureRefusal('activityRemaining', details(remaining));
      }
      await transaction
        .updateTable('foundation.site')
        .set({ active: input.active })
        .where('id', '=', site.id)
        .execute();
      await appendEvent({
        eventType: siteActivationEvent,
        data: { active: input.active },
        objects: [{ type: SITE, id: site.id }],
      });
      await signalChange(transaction, { objectType: SITE, objectId: site.id, version: 1 });
      return {};
    },
  });

  /**
   * Zone : vocation (RG-ORG-004), cohabitation (RG-ORG-010) ; mono-donneur d'ordre, elle désigne son
   * réservataire (RG-ORG-011) ; elle ne bascule pas en mono-donneur d'ordre tant qu'elle porte le stock
   * d'un autre (RG-ORG-013).
   */
  const saveZoneHandler = defineGestureHandler({
    definition: saveZone,
    async execute({ transaction, input, appendEvent }) {
      const site = await transaction
        .selectFrom('foundation.site')
        .select('id')
        .where('id', '=', input.siteId)
        .executeTakeFirst();
      if (site === undefined) throw new GestureRefusal('unknownSite');
      if (input.cohabitation === 'single' && input.principalId === null)
        throw new GestureRefusal('principalRequired');
      const principalId = input.cohabitation === 'single' ? input.principalId : null;
      if (principalId !== null) {
        const principal = await transaction
          .selectFrom('logistics.principal')
          .select('id')
          .where('id', '=', principalId)
          .executeTakeFirst();
        if (principal === undefined) throw new GestureRefusal('unknownPrincipal');
      }
      const taken = await transaction
        .selectFrom('logistics.zone')
        .select('id')
        .where('siteId', '=', input.siteId)
        .where('code', '=', input.code)
        .$if(input.zoneId !== null, (query) => query.where('id', '<>', input.zoneId ?? ''))
        .executeTakeFirst();
      if (taken !== undefined) throw new GestureRefusal('codeTaken');
      const values = {
        siteId: input.siteId,
        code: input.code,
        name: input.name,
        purpose: input.purpose,
        cohabitation: input.cohabitation,
        principalId,
      };
      let zoneId = input.zoneId;
      if (zoneId === null) {
        zoneId = (
          await transaction
            .insertInto('logistics.zone')
            .values(values)
            .returning('id')
            .executeTakeFirstOrThrow()
        ).id;
      } else {
        const current = await transaction
          .selectFrom('logistics.zone')
          .select(['id'])
          .where('id', '=', zoneId)
          .where('siteId', '=', input.siteId)
          .executeTakeFirst();
        if (current === undefined) throw new GestureRefusal('unknownZone');
        if (principalId !== null) {
          const foreign = await activity.foreignStockInZone(transaction, zoneId, principalId);
          if (!nothingRemains(foreign)) throw new GestureRefusal('foreignStock', details(foreign));
        }
        await transaction.updateTable('logistics.zone').set(values).where('id', '=', zoneId).execute();
      }
      await appendEvent({
        eventType: zoneSavedEvent,
        data: {
          siteId: input.siteId,
          code: input.code,
          name: input.name,
          purpose: input.purpose,
          cohabitation: input.cohabitation,
          principalId,
        },
        objects: [
          { type: ZONE, id: zoneId },
          { type: SITE, id: input.siteId },
        ],
      });
      await signalChange(transaction, { objectType: SITE, objectId: input.siteId, version: 1 });
      return { zoneId };
    },
  });

  /** Une zone ne se supprime pas, elle se désactive, et pas tant qu'elle porte du stock (RG-ORG-008, 009). */
  const setZoneActiveHandler = defineGestureHandler({
    definition: setZoneActive,
    async execute({ transaction, input, appendEvent }) {
      const zone = await transaction
        .selectFrom('logistics.zone')
        .select(['id', 'siteId'])
        .where('id', '=', input.zoneId)
        .executeTakeFirst();
      if (zone === undefined) throw new GestureRefusal('unknownZone');
      if (!input.active) {
        const stock = await activity.stockInZone(transaction, zone.id);
        if (!nothingRemains(stock)) throw new GestureRefusal('activityRemaining', details(stock));
      }
      await transaction
        .updateTable('logistics.zone')
        .set({ active: input.active })
        .where('id', '=', zone.id)
        .execute();
      await appendEvent({
        eventType: zoneActivationEvent,
        data: { active: input.active },
        objects: [{ type: ZONE, id: zone.id }],
      });
      await signalChange(transaction, { objectType: SITE, objectId: zone.siteId, version: 1 });
      return {};
    },
  });

  const listPrincipalsForAdministrationHandler = defineQueryHandler({
    definition: listPrincipalsForAdministration,
    permissions: ['administerPrincipals', 'administerUsers', 'administerSites'],
    async execute({ db }) {
      const principals = await db
        .selectFrom('logistics.principal')
        .select(['id', 'code', 'name', 'principalGroup as group', 'internal', 'active'])
        .orderBy('internal', 'desc')
        .orderBy('name')
        .execute();
      return { principals };
    },
  });

  const getPrincipalHandler = defineQueryHandler({
    definition: getPrincipal,
    permissions: ['administerPrincipals'],
    async execute({ db, input }) {
      const principal = await db
        .selectFrom('logistics.principal')
        .selectAll()
        .where('id', '=', input.principalId)
        .executeTakeFirst();
      if (principal === undefined) throw new QueryRefusal('outOfScope');
      return {
        principal: {
          id: principal.id,
          code: principal.code,
          name: principal.name,
          group: principal.principalGroup,
          internal: principal.internal,
          active: principal.active,
          address: addressOf(principal),
          email: principal.email,
          phone: principal.phone,
          currency: principal.currency,
        },
      };
    },
  });

  /** Donneur d'ordre : libellé, code, groupe statistique, coordonnées (RG-ORG-005, 006). */
  const savePrincipalHandler = defineGestureHandler({
    definition: savePrincipal,
    async execute({ transaction, input, appendEvent }) {
      const taken = await transaction
        .selectFrom('logistics.principal')
        .select('id')
        .where('code', '=', input.code)
        .$if(input.principalId !== null, (query) => query.where('id', '<>', input.principalId ?? ''))
        .executeTakeFirst();
      if (taken !== undefined) throw new GestureRefusal('codeTaken');
      const values = {
        code: input.code,
        name: input.name,
        principalGroup: input.group,
        ...addressColumns(input.address),
        countryCode: input.address?.countryCode ?? null,
        email: input.email,
        phone: input.phone,
      };
      let principalId = input.principalId;
      if (principalId === null) {
        principalId = (
          await transaction
            .insertInto('logistics.principal')
            .values(values)
            .returning('id')
            .executeTakeFirstOrThrow()
        ).id;
      } else {
        const updated = await transaction
          .updateTable('logistics.principal')
          .set(values)
          .where('id', '=', principalId)
          .executeTakeFirst();
        if (updated.numUpdatedRows === 0n) throw new GestureRefusal('unknownPrincipal');
      }
      await appendEvent({
        eventType: principalSavedEvent,
        data: { code: input.code, name: input.name, group: input.group },
        objects: [{ type: PRINCIPAL, id: principalId }],
      });
      await signalChange(transaction, { objectType: PRINCIPAL, objectId: principalId, version: 1 });
      return { principalId };
    },
  });

  /**
   * Un donneur d'ordre se désactive, ne se supprime pas (RG-ORG-008) ; pas tant qu'il porte du stock ou
   * un flux en cours (RG-ORG-009) ; jamais le donneur d'ordre interne (RG-ORG-007).
   */
  const setPrincipalActiveHandler = defineGestureHandler({
    definition: setPrincipalActive,
    async execute({ transaction, input, appendEvent }) {
      const principal = await transaction
        .selectFrom('logistics.principal')
        .select(['id', 'internal'])
        .where('id', '=', input.principalId)
        .executeTakeFirst();
      if (principal === undefined) throw new GestureRefusal('unknownPrincipal');
      if (!input.active) {
        if (principal.internal) throw new GestureRefusal('internalPrincipal');
        const remaining = await activity.openForPrincipal(transaction, principal.id);
        if (!nothingRemains(remaining)) throw new GestureRefusal('activityRemaining', details(remaining));
      }
      await transaction
        .updateTable('logistics.principal')
        .set({ active: input.active })
        .where('id', '=', principal.id)
        .execute();
      await appendEvent({
        eventType: principalActivationEvent,
        data: { active: input.active },
        objects: [{ type: PRINCIPAL, id: principal.id }],
      });
      await signalChange(transaction, { objectType: PRINCIPAL, objectId: principal.id, version: 1 });
      return {};
    },
  });

  const getPrincipalRestrictionsHandler = defineQueryHandler({
    definition: getPrincipalRestrictions,
    permissions: ['administerUsers'],
    async execute({ db, input }) {
      const rows = await db
        .selectFrom('logistics.userPrincipalRestriction')
        .select('principalId')
        .where('userId', '=', input.userId)
        .execute();
      return { principalIds: rows.map((row) => row.principalId) };
    },
  });

  /** Restriction explicite d'un utilisateur à certains donneurs d'ordre (RG-ORG-017). */
  const setPrincipalRestrictionsHandler = defineGestureHandler({
    definition: setPrincipalRestrictions,
    async execute({ transaction, input, appendEvent }) {
      const user = await transaction
        .selectFrom('foundation.user')
        .select('id')
        .where('id', '=', input.userId)
        .executeTakeFirst();
      if (user === undefined) throw new GestureRefusal('unknownUser');
      const principalIds = [...new Set(input.principalIds)];
      if (principalIds.length > 0) {
        const found = await transaction
          .selectFrom('logistics.principal')
          .select('id')
          .where('id', 'in', principalIds)
          .execute();
        if (found.length !== principalIds.length) throw new GestureRefusal('unknownPrincipal');
      }
      await transaction
        .deleteFrom('logistics.userPrincipalRestriction')
        .where('userId', '=', input.userId)
        .execute();
      if (principalIds.length > 0) {
        await transaction
          .insertInto('logistics.userPrincipalRestriction')
          .values(principalIds.map((principalId) => ({ userId: input.userId, principalId })))
          .execute();
      }
      await appendEvent({
        eventType: principalRestrictionsSetEvent,
        data: { principalIds },
        objects: [{ type: 'User', id: input.userId }],
      });
      await signalChange(transaction, { objectType: 'User', objectId: input.userId, version: 1 });
      return {};
    },
  });

  return {
    gestures: [
      saveSiteHandler,
      setSiteActiveHandler,
      saveZoneHandler,
      setZoneActiveHandler,
      savePrincipalHandler,
      setPrincipalActiveHandler,
      setPrincipalRestrictionsHandler,
    ],
    queries: [
      listSitesHandler,
      getSiteHandler,
      listPrincipalsForAdministrationHandler,
      getPrincipalHandler,
      getPrincipalRestrictionsHandler,
    ],
  };
}
