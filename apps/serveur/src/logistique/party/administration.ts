import {
  addressUsageSchema,
  anonymizeEndCustomer,
  getParty,
  isDeliverableAddress,
  listAnonymizationSchedule,
  listEndCustomerDuplicates,
  listParties,
  mergeEndCustomers,
  partyFamilySchema,
  principalFamilies,
  saveAddress,
  saveCarrierAccount,
  saveCarrierService,
  saveParty,
  setAddressActive,
  setCarrierAccountActive,
  setCarrierServiceActive,
  setEndCustomerRetention,
  setPartyActive,
  subcontractingNatureSchema,
  type Permission,
  type PartyFamily,
} from '@cairn/contrat';
import { sql, type Kysely } from 'kysely';
import { z } from 'zod';
import type { DatabaseTransaction, DB } from '../../socle/database/index.js';
import { defineGestureHandler, GestureRefusal } from '../../socle/gesture/index.js';
import { nextNumber } from '../../socle/numbering/index.js';
import { defineQueryHandler, QueryRefusal } from '../../socle/query/index.js';
import { signalChange } from '../../socle/signal/index.js';
import { defineTraceEventType } from '../../socle/trace-event/index.js';
import { canSeePrincipal, visiblePrincipalIds, type RemainingActivity } from '../organization/index.js';
import {
  anonymizationDueOn,
  anonymizeParty,
  endCustomerAutoAnonymizedEvent as endCustomerAnonymizedEvent,
} from './anonymization.js';

export const PARTY = 'Party';

/** Ce que les autres modules savent d'un tiers : flux en cours d'un client final, stock chez un sous-traitant. */
export interface PartyActivity {
  readonly openFlowsOfEndCustomer: (transaction: Kysely<DB>, partyId: string) => Promise<number>;
  readonly stockAtSubcontractor: (
    transaction: DatabaseTransaction,
    partyId: string,
  ) => Promise<RemainingActivity>;
}

const isPrincipalFamily = (family: PartyFamily) => principalFamilies.includes(family);
/** La permission qu'exige un geste sur un tiers dépend de sa famille (0.5 § 4). */
const permissionFor = (family: PartyFamily): Permission =>
  isPrincipalFamily(family) ? 'managePrincipalParties' : 'administerProviderParties';

async function partyOf(transaction: Kysely<DB>, partyId: string) {
  const party = await transaction
    .selectFrom('logistics.party')
    .select(['id', 'family', 'principalId', 'anonymizedAt', 'mergedIntoPartyId', 'code', 'name'])
    .where('id', '=', partyId)
    .executeTakeFirst();
  if (party === undefined) return undefined;
  return { ...party, family: partyFamilySchema.parse(party.family) };
}

export const partySavedEvent = defineTraceEventType(
  'partySaved',
  z.object({ family: z.string(), principalId: z.string().nullable(), code: z.string() }),
);
export const partyActivationEvent = defineTraceEventType(
  'partyActivationChanged',
  z.object({ active: z.boolean() }),
);
export const addressSavedEvent = defineTraceEventType(
  'partyAddressSaved',
  z.object({ addressId: z.string(), usage: z.string(), isDefault: z.boolean(), countryCode: z.string() }),
);
export const addressActivationEvent = defineTraceEventType(
  'partyAddressActivationChanged',
  z.object({ addressId: z.string(), active: z.boolean() }),
);
export const carrierServiceSavedEvent = defineTraceEventType(
  'carrierServiceSaved',
  z.object({ serviceId: z.string(), code: z.string() }),
);
export const carrierAccountSavedEvent = defineTraceEventType(
  'carrierAccountSaved',
  z.object({ accountId: z.string(), principalId: z.string().nullable() }),
);
export const endCustomersMergedEvent = defineTraceEventType(
  'endCustomersMerged',
  z.object({ keptPartyId: z.string(), absorbedPartyId: z.string(), takeFromAbsorbed: z.array(z.string()) }),
);
export const retentionSetEvent = defineTraceEventType(
  'endCustomerRetentionSet',
  z.object({ months: z.int().nullable() }),
);

/** Gestes et consultations du module 0.5. */
export function partyAdministration(activity: PartyActivity) {
  /** Refus si le tiers est hors de ce que l'utilisateur voit : un tiers d'un donneur d'ordre restreint (RG-ORG-017). */
  async function visibleOrRefuse(db: Kysely<DB>, userId: string, principalId: string | null): Promise<void> {
    if (principalId !== null && !(await canSeePrincipal(db, userId, principalId)))
      throw new QueryRefusal('outOfScope');
  }

  const listPartiesHandler = defineQueryHandler({
    definition: listParties,
    permissions: [
      'managePrincipalParties',
      'administerProviderParties',
      'mergeEndCustomers',
      'anonymizeEndCustomers',
    ],
    async execute({ db, userId, input }) {
      if (isPrincipalFamily(input.family) && input.principalId === null)
        throw new QueryRefusal('invalidInput');
      await visibleOrRefuse(db, userId, input.principalId);
      const search = input.search?.trim().toLowerCase() ?? '';
      const rows = await db
        .selectFrom('logistics.party as party')
        .select([
          'party.id',
          'party.family',
          'party.principalId',
          'party.code',
          'party.name',
          'party.active',
          'party.toComplete',
          'party.anonymizedAt',
          'party.mergedIntoPartyId',
          sql<
            string | null
          >`(select city from logistics.party_address address where address.party_id = party.id
            and address.active order by address.is_default desc limit 1)`.as('city'),
        ])
        .where('party.family', '=', input.family)
        .$if(isPrincipalFamily(input.family), (query) =>
          query.where('party.principalId', '=', input.principalId ?? ''),
        )
        .$if(search !== '', (query) =>
          query.where((eb) =>
            eb.or([
              eb(sql`lower(party.name)`, 'like', `%${search}%`),
              eb(sql`lower(party.code)`, 'like', `%${search}%`),
              eb(sql`lower(coalesce(party.email, ''))`, 'like', `%${search}%`),
            ]),
          ),
        )
        .orderBy('party.name')
        .limit(500)
        .execute();
      return {
        parties: rows.map((row) => ({
          id: row.id,
          family: partyFamilySchema.parse(row.family),
          principalId: row.principalId,
          code: row.code,
          name: row.name,
          city: row.city,
          active: row.active,
          toComplete: row.toComplete,
          anonymized: row.anonymizedAt !== null,
          mergedIntoPartyId: row.mergedIntoPartyId,
        })),
      };
    },
  });

  const getPartyHandler = defineQueryHandler({
    definition: getParty,
    permissions: [
      'managePrincipalParties',
      'administerProviderParties',
      'mergeEndCustomers',
      'anonymizeEndCustomers',
    ],
    async execute({ db, userId, input }) {
      const party = await db
        .selectFrom('logistics.party')
        .selectAll()
        .where('id', '=', input.partyId)
        .executeTakeFirst();
      if (party === undefined) throw new QueryRefusal('outOfScope');
      await visibleOrRefuse(db, userId, party.principalId);
      const [addresses, services, accounts, principal] = await Promise.all([
        db
          .selectFrom('logistics.partyAddress')
          .select([
            'id',
            'usage',
            'isDefault',
            'recipient',
            'line1',
            'line2',
            'postalCode',
            'city',
            'countryCode',
            'active',
          ])
          .where('partyId', '=', party.id)
          .orderBy('usage')
          .orderBy('isDefault', 'desc')
          .execute(),
        db
          .selectFrom('logistics.carrierService')
          .selectAll()
          .where('carrierId', '=', party.id)
          .orderBy('code')
          .execute(),
        db
          .selectFrom('logistics.carrierAccount')
          .select(['id', 'principalId', 'accountNumber', 'contractReference', 'active'])
          .where('carrierId', '=', party.id)
          .execute(),
        party.principalId === null
          ? Promise.resolve(undefined)
          : db
              .selectFrom('logistics.principal')
              .select('endCustomerRetentionMonths')
              .where('id', '=', party.principalId)
              .executeTakeFirst(),
      ]);
      const family = partyFamilySchema.parse(party.family);
      return {
        party: {
          id: party.id,
          family,
          principalId: party.principalId,
          code: party.code,
          name: party.name,
          city: addresses.find((address) => address.active)?.city ?? null,
          active: party.active,
          toComplete: party.toComplete,
          anonymized: party.anonymizedAt !== null,
          mergedIntoPartyId: party.mergedIntoPartyId,
          email: party.email,
          phone: party.phone,
          subcontractingNature:
            party.subcontractingNature === null
              ? null
              : subcontractingNatureSchema.parse(party.subcontractingNature),
          issuesDestructionCertificate: party.issuesDestructionCertificate,
          lastFlowAt: party.lastFlowAt?.toISOString() ?? null,
          anonymizationDueOn:
            family === 'endCustomer' && party.anonymizedAt === null
              ? anonymizationDueOn(
                  party.lastFlowAt ?? party.createdAt,
                  principal?.endCustomerRetentionMonths ?? null,
                )
              : null,
          addresses: addresses.map((address) => ({
            ...address,
            usage: addressUsageSchema.parse(address.usage),
          })),
          services: services.map((service) => ({
            id: service.id,
            code: service.code,
            name: service.name,
            direction: z.enum(['outbound', 'return', 'both']).parse(service.direction),
            maxWeightGrams: service.maxWeightGrams,
            maxLengthMm: service.maxLengthMm,
            maxWidthMm: service.maxWidthMm,
            maxHeightMm: service.maxHeightMm,
            maxDimensionSumMm: service.maxDimensionSumMm,
            maxInsuredValueCents:
              service.maxInsuredValueCents === null ? null : Number(service.maxInsuredValueCents),
            acceptsDangerousGoods: service.acceptsDangerousGoods,
            label: z.enum(['none', 'carrier', 'provider']).parse(service.label),
            leadTimeDays: service.leadTimeDays,
            active: service.active,
          })),
          accounts,
        },
      };
    },
  });

  /**
   * Crée ou modifie un tiers (RG-TRS-001 à 006). Fournisseur et client final appartiennent à un donneur
   * d'ordre, transporteur et sous-traitant au prestataire ; un client final sans clé reçoit une clé
   * générée (RG-TRS-012). Une fiche anonymisée ou absorbée ne se modifie plus.
   */
  const savePartyHandler = defineGestureHandler({
    definition: saveParty,
    permission: (input) => Promise.resolve(permissionFor(input.family)),
    async execute({ transaction, author, input, appendEvent }) {
      const ownedByPrincipal = isPrincipalFamily(input.family);
      if (ownedByPrincipal !== (input.principalId !== null)) throw new GestureRefusal('principalMismatch');
      let principalCode: string | undefined;
      if (input.principalId !== null) {
        const principal = await transaction
          .selectFrom('logistics.principal')
          .select('code')
          .where('id', '=', input.principalId)
          .executeTakeFirst();
        if (
          principal === undefined ||
          !(await canSeePrincipal(transaction, author.userId, input.principalId))
        ) {
          throw new GestureRefusal('unknownPrincipal');
        }
        principalCode = principal.code;
      }
      if ((input.subcontractingNature === null) === (input.family === 'subcontractor')) {
        throw new GestureRefusal('principalMismatch');
      }
      const existing = input.partyId === null ? undefined : await partyOf(transaction, input.partyId);
      if (input.partyId !== null && existing?.family !== input.family) {
        throw new GestureRefusal('unknownParty');
      }
      if (existing !== undefined && (existing.anonymizedAt !== null || existing.mergedIntoPartyId !== null)) {
        throw new GestureRefusal('anonymizedParty');
      }
      let code = input.code ?? existing?.code ?? null;
      if (code === null || code === '') {
        if (input.family !== 'endCustomer') throw new GestureRefusal('codeRequired');
        code = await nextNumber(
          transaction,
          'EndCustomer',
          principalCode === undefined ? {} : { principalCode },
        );
      }
      const taken = await transaction
        .selectFrom('logistics.party')
        .select('id')
        .where('family', '=', input.family)
        .where('code', '=', code)
        .$if(input.principalId !== null, (query) => query.where('principalId', '=', input.principalId ?? ''))
        .$if(input.principalId === null, (query) => query.where('principalId', 'is', null))
        .$if(input.partyId !== null, (query) => query.where('id', '<>', input.partyId ?? ''))
        .executeTakeFirst();
      if (taken !== undefined) throw new GestureRefusal('codeTaken');
      const values = {
        code,
        name: input.name,
        email: input.email,
        phone: input.phone,
        subcontractingNature: input.subcontractingNature,
        issuesDestructionCertificate: input.family === 'subcontractor' && input.issuesDestructionCertificate,
      };
      let partyId = input.partyId;
      if (partyId === null) {
        partyId = (
          await transaction
            .insertInto('logistics.party')
            .values({
              ...values,
              family: input.family,
              principalId: input.principalId,
              // Sans adresse, un client final est une fiche à compléter (0.5, cas limites).
              toComplete: input.family === 'endCustomer',
            })
            .returning('id')
            .executeTakeFirstOrThrow()
        ).id;
      } else {
        await transaction.updateTable('logistics.party').set(values).where('id', '=', partyId).execute();
      }
      // L'événement désigne le tiers par son identifiant, jamais par son nom (fiche 0022, règle 2).
      await appendEvent({
        eventType: partySavedEvent,
        data: { family: input.family, principalId: input.principalId, code },
        objects: [{ type: PARTY, id: partyId }],
      });
      await signalChange(transaction, { objectType: PARTY, objectId: partyId, version: 1 });
      return { partyId, code };
    },
  });

  /** Un tiers se désactive, ne se supprime pas (RG-TRS-004, 005) ; un sous-traitant, pas avec du stock chez lui. */
  const setPartyActiveHandler = defineGestureHandler({
    definition: setPartyActive,
    async permission(input, transaction) {
      const party = await partyOf(transaction, input.partyId);
      return party === undefined ? null : permissionFor(party.family);
    },
    async execute({ transaction, input, appendEvent }) {
      const party = await partyOf(transaction, input.partyId);
      if (party === undefined) throw new GestureRefusal('unknownParty');
      if (!input.active && party.family === 'subcontractor') {
        const stock = await activity.stockAtSubcontractor(transaction, party.id);
        const remaining = Object.fromEntries(Object.entries(stock).filter(([, count]) => count > 0));
        if (Object.keys(remaining).length > 0) throw new GestureRefusal('activityRemaining', remaining);
      }
      await transaction
        .updateTable('logistics.party')
        .set({ active: input.active })
        .where('id', '=', party.id)
        .execute();
      await appendEvent({
        eventType: partyActivationEvent,
        data: { active: input.active },
        objects: [{ type: PARTY, id: party.id }],
      });
      await signalChange(transaction, { objectType: PARTY, objectId: party.id, version: 1 });
      return {};
    },
  });

  /**
   * Adresse d'un tiers, par usage (RG-TRS-007) ; celle marquée par défaut le devient seule pour son usage
   * (RG-TRS-008) ; code postal au format du pays (RG-TRS-009). Une fiche client final complétée d'une
   * adresse valable n'est plus à compléter.
   */
  const saveAddressHandler = defineGestureHandler({
    definition: saveAddress,
    async permission(input, transaction) {
      const party = await partyOf(transaction, input.partyId);
      return party === undefined ? null : permissionFor(party.family);
    },
    async execute({ transaction, input, appendEvent }) {
      const party = await partyOf(transaction, input.partyId);
      if (party === undefined) throw new GestureRefusal('unknownParty');
      if (party.anonymizedAt !== null || party.mergedIntoPartyId !== null)
        throw new GestureRefusal('anonymizedParty');
      if (!isDeliverableAddress(input))
        throw new GestureRefusal('postalCodeFormat', { countryCode: input.countryCode });
      const values = {
        usage: input.usage,
        isDefault: input.isDefault,
        recipient: input.recipient,
        line1: input.line1,
        line2: input.line2,
        postalCode: input.postalCode.toUpperCase(),
        city: input.city,
        countryCode: input.countryCode,
      };
      if (input.isDefault) {
        await transaction
          .updateTable('logistics.partyAddress')
          .set({ isDefault: false })
          .where('partyId', '=', party.id)
          .where('usage', '=', input.usage)
          .execute();
      }
      let addressId = input.addressId;
      if (addressId === null) {
        addressId = (
          await transaction
            .insertInto('logistics.partyAddress')
            .values({ ...values, partyId: party.id })
            .returning('id')
            .executeTakeFirstOrThrow()
        ).id;
      } else {
        const updated = await transaction
          .updateTable('logistics.partyAddress')
          .set(values)
          .where('id', '=', addressId)
          .where('partyId', '=', party.id)
          .executeTakeFirst();
        if (updated.numUpdatedRows === 0n) throw new GestureRefusal('unknownAddress');
      }
      if (party.family === 'endCustomer') {
        await transaction
          .updateTable('logistics.party')
          .set({ toComplete: false })
          .where('id', '=', party.id)
          .execute();
      }
      await appendEvent({
        eventType: addressSavedEvent,
        data: { addressId, usage: input.usage, isDefault: input.isDefault, countryCode: input.countryCode },
        objects: [{ type: PARTY, id: party.id }],
      });
      await signalChange(transaction, { objectType: PARTY, objectId: party.id, version: 1 });
      return { addressId };
    },
  });

  const setAddressActiveHandler = defineGestureHandler({
    definition: setAddressActive,
    async permission(input, transaction) {
      const address = await transaction
        .selectFrom('logistics.partyAddress as address')
        .innerJoin('logistics.party as party', 'party.id', 'address.partyId')
        .select('party.family')
        .where('address.id', '=', input.addressId)
        .executeTakeFirst();
      return address === undefined ? null : permissionFor(partyFamilySchema.parse(address.family));
    },
    async execute({ transaction, input, appendEvent }) {
      const address = await transaction
        .updateTable('logistics.partyAddress')
        .set({ active: input.active, ...(input.active ? {} : { isDefault: false }) })
        .where('id', '=', input.addressId)
        .returning('partyId')
        .executeTakeFirst();
      if (address === undefined) throw new GestureRefusal('unknownAddress');
      await appendEvent({
        eventType: addressActivationEvent,
        data: { addressId: input.addressId, active: input.active },
        objects: [{ type: PARTY, id: address.partyId }],
      });
      await signalChange(transaction, { objectType: PARTY, objectId: address.partyId, version: 1 });
      return {};
    },
  });

  async function carrierOrRefuse(transaction: DatabaseTransaction, carrierId: string): Promise<void> {
    const carrier = await partyOf(transaction, carrierId);
    if (carrier?.family !== 'carrier') throw new GestureRefusal('unknownParty');
  }

  /** Service d'un transporteur : sens, contraintes, étiquette, délai annoncé (RG-TRS-025 à 029). */
  const saveCarrierServiceHandler = defineGestureHandler({
    definition: saveCarrierService,
    async execute({ transaction, input, appendEvent }) {
      await carrierOrRefuse(transaction, input.carrierId);
      const taken = await transaction
        .selectFrom('logistics.carrierService')
        .select('id')
        .where('carrierId', '=', input.carrierId)
        .where('code', '=', input.code)
        .$if(input.serviceId !== null, (query) => query.where('id', '<>', input.serviceId ?? ''))
        .executeTakeFirst();
      if (taken !== undefined) throw new GestureRefusal('codeTaken');
      const { serviceId: requested, carrierId, ...values } = input;
      let serviceId = requested;
      if (serviceId === null) {
        serviceId = (
          await transaction
            .insertInto('logistics.carrierService')
            .values({ ...values, carrierId })
            .returning('id')
            .executeTakeFirstOrThrow()
        ).id;
      } else {
        const updated = await transaction
          .updateTable('logistics.carrierService')
          .set(values)
          .where('id', '=', serviceId)
          .where('carrierId', '=', carrierId)
          .executeTakeFirst();
        if (updated.numUpdatedRows === 0n) throw new GestureRefusal('unknownService');
      }
      await appendEvent({
        eventType: carrierServiceSavedEvent,
        data: { serviceId, code: input.code },
        objects: [{ type: PARTY, id: carrierId }],
      });
      await signalChange(transaction, { objectType: PARTY, objectId: carrierId, version: 1 });
      return { serviceId };
    },
  });

  /** Un service désactivé reste lisible sur les expéditions passées (RG-TRS-031). */
  const setCarrierServiceActiveHandler = defineGestureHandler({
    definition: setCarrierServiceActive,
    async execute({ transaction, input }) {
      const service = await transaction
        .updateTable('logistics.carrierService')
        .set({ active: input.active })
        .where('id', '=', input.serviceId)
        .returning('carrierId')
        .executeTakeFirst();
      if (service === undefined) throw new GestureRefusal('unknownService');
      await signalChange(transaction, { objectType: PARTY, objectId: service.carrierId, version: 1 });
      return {};
    },
  });

  /** Compte transporteur, du prestataire ou d'un donneur d'ordre qui impose son contrat (RG-TRS-030). */
  const saveCarrierAccountHandler = defineGestureHandler({
    definition: saveCarrierAccount,
    async execute({ transaction, input, appendEvent }) {
      await carrierOrRefuse(transaction, input.carrierId);
      if (input.principalId !== null) {
        const principal = await transaction
          .selectFrom('logistics.principal')
          .select('id')
          .where('id', '=', input.principalId)
          .executeTakeFirst();
        if (principal === undefined) throw new GestureRefusal('unknownPrincipal');
      }
      const values = {
        principalId: input.principalId,
        accountNumber: input.accountNumber,
        contractReference: input.contractReference,
      };
      let accountId = input.accountId;
      try {
        if (accountId === null) {
          accountId = (
            await transaction
              .insertInto('logistics.carrierAccount')
              .values({ ...values, carrierId: input.carrierId })
              .returning('id')
              .executeTakeFirstOrThrow()
          ).id;
        } else {
          const updated = await transaction
            .updateTable('logistics.carrierAccount')
            .set(values)
            .where('id', '=', accountId)
            .where('carrierId', '=', input.carrierId)
            .executeTakeFirst();
          if (updated.numUpdatedRows === 0n) throw new GestureRefusal('unknownAccount');
        }
      } catch (error) {
        if (z.object({ constraint: z.literal('carrier_account_scope') }).safeParse(error).success) {
          throw new GestureRefusal('codeTaken');
        }
        throw error;
      }
      await appendEvent({
        eventType: carrierAccountSavedEvent,
        data: { accountId, principalId: input.principalId },
        objects: [{ type: PARTY, id: input.carrierId }],
      });
      await signalChange(transaction, { objectType: PARTY, objectId: input.carrierId, version: 1 });
      return { accountId };
    },
  });

  const setCarrierAccountActiveHandler = defineGestureHandler({
    definition: setCarrierAccountActive,
    async execute({ transaction, input }) {
      const account = await transaction
        .updateTable('logistics.carrierAccount')
        .set({ active: input.active })
        .where('id', '=', input.accountId)
        .returning('carrierId')
        .executeTakeFirst();
      if (account === undefined) throw new GestureRefusal('unknownAccount');
      await signalChange(transaction, { objectType: PARTY, objectId: account.carrierId, version: 1 });
      return {};
    },
  });

  /**
   * Doublons potentiels chez un donneur d'ordre : même nom, même adresse électronique ou même téléphone.
   * Signalés, jamais fusionnés d'office (RG-TRS-015).
   */
  const listEndCustomerDuplicatesHandler = defineQueryHandler({
    definition: listEndCustomerDuplicates,
    permissions: ['managePrincipalParties', 'mergeEndCustomers'],
    async execute({ db, userId, input }) {
      await visibleOrRefuse(db, userId, input.principalId);
      const rows = await sql<{ first: string; second: string; reason: 'name' | 'email' | 'phone' }>`
        select a.id as first, b.id as second,
          case when lower(a.name) = lower(b.name) then 'name'
               when lower(a.email) = lower(b.email) then 'email'
               else 'phone' end as reason
        from logistics.party a
        join logistics.party b on b.principal_id = a.principal_id and b.id > a.id
        where a.family = 'endCustomer' and b.family = 'endCustomer' and a.principal_id = ${input.principalId}
          and a.anonymized_at is null and b.anonymized_at is null
          and a.merged_into_party_id is null and b.merged_into_party_id is null
          and (lower(a.name) = lower(b.name)
            or (a.email is not null and lower(a.email) = lower(b.email))
            or (a.phone is not null and regexp_replace(a.phone, '\\D', '', 'g') = regexp_replace(b.phone, '\\D', '', 'g')))
        limit 200`.execute(db);
      const ids = [...new Set(rows.rows.flatMap((row) => [row.first, row.second]))];
      const parties =
        ids.length === 0
          ? []
          : (
              await listPartiesHandler.execute({
                db,
                userId,
                input: { family: 'endCustomer', principalId: input.principalId, search: null },
              })
            ).parties;
      const byId = new Map(parties.map((party) => [party.id, party]));
      return {
        pairs: rows.rows.flatMap((row) => {
          const first = byId.get(row.first);
          const second = byId.get(row.second);
          return first === undefined || second === undefined ? [] : [{ first, second, reason: row.reason }];
        }),
      };
    },
  });

  /**
   * Fusion décidée par un humain habilité (RG-TRS-015, 016) : la fiche conservée prend les valeurs
   * retenues, reçoit les adresses de l'absorbée, qui reste consultable en lecture seule. Les flux
   * rejoindront la fiche conservée avec leurs modules.
   */
  const mergeEndCustomersHandler = defineGestureHandler({
    definition: mergeEndCustomers,
    async execute({ transaction, author, input, appendEvent }) {
      if (input.keptPartyId === input.absorbedPartyId) throw new GestureRefusal('samePartyTwice');
      const [kept, absorbed] = await Promise.all([
        transaction
          .selectFrom('logistics.party')
          .selectAll()
          .where('id', '=', input.keptPartyId)
          .executeTakeFirst(),
        transaction
          .selectFrom('logistics.party')
          .selectAll()
          .where('id', '=', input.absorbedPartyId)
          .executeTakeFirst(),
      ]);
      if (kept === undefined || absorbed === undefined) throw new GestureRefusal('unknownParty');
      if (kept.family !== 'endCustomer' || absorbed.family !== 'endCustomer')
        throw new GestureRefusal('notEndCustomers');
      if (kept.principalId !== absorbed.principalId) throw new GestureRefusal('principalMismatch');
      if (
        kept.principalId === null ||
        !(await canSeePrincipal(transaction, author.userId, kept.principalId))
      ) {
        throw new GestureRefusal('unknownParty');
      }
      if (kept.mergedIntoPartyId !== null || absorbed.mergedIntoPartyId !== null)
        throw new GestureRefusal('alreadyMerged');
      if (kept.anonymizedAt !== null || absorbed.anonymizedAt !== null)
        throw new GestureRefusal('anonymizedParty');
      const take = new Set(input.takeFromAbsorbed);
      await transaction
        .updateTable('logistics.party')
        .set({
          name: take.has('name') ? absorbed.name : kept.name,
          email: take.has('email') ? absorbed.email : kept.email,
          phone: take.has('phone') ? absorbed.phone : kept.phone,
          lastFlowAt: sql`greatest(last_flow_at, ${absorbed.lastFlowAt})`,
        })
        .where('id', '=', kept.id)
        .execute();
      await sql`
        insert into logistics.party_address (party_id, usage, is_default, recipient, line1, line2, postal_code, city, country_code, active)
        select ${kept.id}, usage, false, recipient, line1, line2, postal_code, city, country_code, active
        from logistics.party_address where party_id = ${absorbed.id}`.execute(transaction);
      await transaction
        .updateTable('logistics.party')
        .set({ mergedIntoPartyId: kept.id, active: false })
        .where('id', '=', absorbed.id)
        .execute();
      await appendEvent({
        eventType: endCustomersMergedEvent,
        data: { keptPartyId: kept.id, absorbedPartyId: absorbed.id, takeFromAbsorbed: [...take] },
        objects: [
          { type: PARTY, id: kept.id },
          { type: PARTY, id: absorbed.id },
        ],
      });
      await signalChange(transaction, { objectType: PARTY, objectId: kept.id, version: 1 });
      await signalChange(transaction, { objectType: PARTY, objectId: absorbed.id, version: 1 });
      return {};
    },
  });

  /**
   * Anonymisation anticipée, avec motif (RG-TRS-022) ; irréversible (RG-TRS-023) ; jamais tant qu'un flux
   * est en cours (RG-TRS-024). Le motif n'entre pas dans le journal s'il pouvait identifier : il y entre
   * comme texte libre saisi par l'opérateur, à lui de ne pas y mettre d'identité.
   */
  const anonymizeEndCustomerHandler = defineGestureHandler({
    definition: anonymizeEndCustomer,
    async execute({ transaction, author, input, appendEvent }) {
      const party = await partyOf(transaction, input.partyId);
      if (party === undefined) throw new GestureRefusal('unknownParty');
      if (party.family !== 'endCustomer') throw new GestureRefusal('notEndCustomers');
      if (
        party.principalId === null ||
        !(await canSeePrincipal(transaction, author.userId, party.principalId))
      ) {
        throw new GestureRefusal('unknownParty');
      }
      if (party.anonymizedAt !== null) throw new GestureRefusal('anonymizedParty');
      if ((await activity.openFlowsOfEndCustomer(transaction, party.id)) > 0)
        throw new GestureRefusal('openFlows');
      await anonymizeParty(transaction, party.id);
      await appendEvent({
        eventType: endCustomerAnonymizedEvent,
        data: { reason: input.reason, early: true },
        objects: [{ type: PARTY, id: party.id }],
      });
      await signalChange(transaction, { objectType: PARTY, objectId: party.id, version: 1 });
      return {};
    },
  });

  /** Durée de conservation par donneur d'ordre (RG-TRS-017) ; sans elle, aucune anonymisation automatique. */
  const setEndCustomerRetentionHandler = defineGestureHandler({
    definition: setEndCustomerRetention,
    async execute({ transaction, input, appendEvent }) {
      const updated = await transaction
        .updateTable('logistics.principal')
        .set({ endCustomerRetentionMonths: input.months })
        .where('id', '=', input.principalId)
        .executeTakeFirst();
      if (updated.numUpdatedRows === 0n) throw new GestureRefusal('unknownPrincipal');
      await appendEvent({
        eventType: retentionSetEvent,
        data: { months: input.months },
        objects: [{ type: 'Principal', id: input.principalId }],
      });
      await signalChange(transaction, { objectType: 'Principal', objectId: input.principalId, version: 1 });
      return {};
    },
  });

  /** Échéances par donneur d'ordre : à venir sous trente jours, reportées, anonymisés sur trente jours. */
  const listAnonymizationScheduleHandler = defineQueryHandler({
    definition: listAnonymizationSchedule,
    permissions: ['managePrincipalParties', 'anonymizeEndCustomers'],
    async execute({ db, userId }) {
      const visible = await visiblePrincipalIds(db, userId);
      const principals = await db
        .selectFrom('logistics.principal')
        .select(['id', 'name', 'endCustomerRetentionMonths'])
        .where('active', '=', true)
        .where('internal', '=', false)
        .$if(visible !== null, (query) => query.where('id', 'in', visible ?? []))
        .orderBy('name')
        .execute();
      const result = [];
      for (const principal of principals) {
        const counts = await sql<{ dueSoon: number; anonymized: number; candidates: string[] }>`
          select
            count(*) filter (where anonymized_at is null and ${principal.endCustomerRetentionMonths}::int is not null
              and coalesce(last_flow_at, created_at) + make_interval(months => ${principal.endCustomerRetentionMonths}::int)
                <= now() + interval '30 days')::int as "dueSoon",
            count(*) filter (where anonymized_at >= now() - interval '30 days')::int as anonymized,
            coalesce(array_agg(id::text) filter (where anonymized_at is null and ${principal.endCustomerRetentionMonths}::int is not null
              and coalesce(last_flow_at, created_at) + make_interval(months => ${principal.endCustomerRetentionMonths}::int) <= now()), '{}') as candidates
          from logistics.party
          where family = 'endCustomer' and principal_id = ${principal.id} and merged_into_party_id is null`.execute(
          db,
        );
        const row = counts.rows[0];
        let postponed = 0;
        for (const candidate of row?.candidates ?? []) {
          if ((await activity.openFlowsOfEndCustomer(db, candidate)) > 0) postponed += 1;
        }
        result.push({
          principalId: principal.id,
          principalName: principal.name,
          retentionMonths: principal.endCustomerRetentionMonths,
          dueSoon: row?.dueSoon ?? 0,
          postponed,
          anonymizedInPeriod: row?.anonymized ?? 0,
        });
      }
      return { principals: result };
    },
  });

  return {
    gestures: [
      savePartyHandler,
      setPartyActiveHandler,
      saveAddressHandler,
      setAddressActiveHandler,
      saveCarrierServiceHandler,
      setCarrierServiceActiveHandler,
      saveCarrierAccountHandler,
      setCarrierAccountActiveHandler,
      mergeEndCustomersHandler,
      anonymizeEndCustomerHandler,
      setEndCustomerRetentionHandler,
    ],
    queries: [
      listPartiesHandler,
      getPartyHandler,
      listEndCustomerDuplicatesHandler,
      listAnonymizationScheduleHandler,
    ],
  };
}
