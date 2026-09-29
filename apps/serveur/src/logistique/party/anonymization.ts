import { sql } from 'kysely';
import { z } from 'zod';
import type { Database, DatabaseTransaction } from '../../socle/database/index.js';
import { defineJob } from '../../socle/job/index.js';
import { appendTraceEvent, defineTraceEventType } from '../../socle/trace-event/index.js';

/**
 * Efface les données identifiantes d'un client final (RG-TRS-018) : nom, adresses, téléphone, adresse
 * électronique. La fiche reste, marquée anonymisée ; aucun flux, mouvement ou événement n'est touché
 * (RG-TRS-019). Les adresses recopiées sur les flux le seront avec leurs modules (RG-TRS-021).
 */
export async function anonymizeParty(transaction: DatabaseTransaction, partyId: string): Promise<void> {
  await transaction
    .updateTable('logistics.party')
    .set({ name: '', email: null, phone: null, anonymizedAt: sql`now()`, toComplete: false })
    .where('id', '=', partyId)
    .execute();
  await transaction
    .updateTable('logistics.partyAddress')
    .set({ recipient: null, line1: null, line2: null, postalCode: null, city: null })
    .where('partyId', '=', partyId)
    .execute();
}

/** Échéance d'anonymisation : le dernier flux, ou la création, plus la durée de conservation (RG-TRS-017). */
export function anonymizationDueOn(from: Date, retentionMonths: number | null): string | null {
  if (retentionMonths === null) return null;
  const due = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + retentionMonths, from.getUTCDate()),
  );
  return due.toISOString().slice(0, 10);
}

export const endCustomerAutoAnonymizedEvent = defineTraceEventType(
  'endCustomerAnonymized',
  z.object({ reason: z.string().nullable(), early: z.boolean() }),
);

/**
 * Anonymisation à échéance (RG-TRS-017, 018, 024) : les échéances sont des données (fiche 0028, règle 1),
 * ce travail récurrent traite toutes celles qui sont dues, rattrapant un arrêt ; un client qui porte un
 * flux en cours est reporté jusqu'à sa clôture. Un donneur d'ordre sans durée n'anonymise rien.
 */
export function anonymizeDueEndCustomersJob(
  openFlowsOfEndCustomer: (db: Database, partyId: string) => Promise<number>,
) {
  return defineJob({
    name: 'anonymizeDueEndCustomers',
    payload: z.object({}),
    async run(_payload, { db }) {
      const due = await sql<{ id: string }>`
        select party.id from logistics.party party
        join logistics.principal principal on principal.id = party.principal_id
        where party.family = 'endCustomer' and party.anonymized_at is null and party.merged_into_party_id is null
          and principal.end_customer_retention_months is not null
          and coalesce(party.last_flow_at, party.created_at)
            + make_interval(months => principal.end_customer_retention_months) <= now()
        limit 1000`.execute(db);
      for (const { id } of due.rows) {
        if ((await openFlowsOfEndCustomer(db, id)) > 0) continue;
        await db.transaction().execute(async (transaction) => {
          // Rejouable sans effet double : un client déjà anonymisé entre-temps est laissé tel quel.
          const still = await transaction
            .selectFrom('logistics.party')
            .select('id')
            .where('id', '=', id)
            .where('anonymizedAt', 'is', null)
            .forUpdate()
            .executeTakeFirst();
          if (still === undefined) return;
          await anonymizeParty(transaction, id);
          await appendTraceEvent(transaction, {
            eventType: endCustomerAutoAnonymizedEvent,
            data: { reason: null, early: false },
            author: { origin: 'retention' },
            objects: [{ type: 'Party', id }],
          });
        });
      }
    },
  });
}
