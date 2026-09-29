import { sql } from 'kysely';
import type { DatabaseTransaction } from '../../socle/database/index.js';

/** Flux de réception en cours sur un site : attendus ouverts, arrivages non libérés (RG-ORG-009). */
export async function openReceptionFlowsOnSite(transaction: DatabaseTransaction, siteId: string) {
  const row = await sql<{ expectedReceipts: number; inboundArrivals: number }>`
    select
      (select count(*)::int from logistics.expected_receipt where site_id = ${siteId} and state = 'open') as "expectedReceipts",
      (select count(*)::int from logistics.inbound_arrival where site_id = ${siteId} and released_at is null) as "inboundArrivals"
  `.execute(transaction);
  return row.rows[0] ?? { expectedReceipts: 0, inboundArrivals: 0 };
}

/** Flux de réception en cours d'un donneur d'ordre (RG-ORG-009). */
export async function openReceptionFlowsForPrincipal(transaction: DatabaseTransaction, principalId: string) {
  const row = await sql<{ expectedReceipts: number }>`
    select count(*)::int as "expectedReceipts" from logistics.expected_receipt
    where principal_id = ${principalId} and state = 'open'`.execute(transaction);
  return row.rows[0] ?? { expectedReceipts: 0 };
}

/** Vrai si un flux de réception, même clos, a déjà concerné le site. */
export async function receptionHistoryOnSite(
  transaction: DatabaseTransaction,
  siteId: string,
): Promise<boolean> {
  const row = await sql<{ exists: boolean }>`
    select exists (select 1 from logistics.expected_receipt where site_id = ${siteId})
        or exists (select 1 from logistics.inbound_arrival where site_id = ${siteId}) as exists`.execute(
    transaction,
  );
  return row.rows[0]?.exists ?? false;
}
