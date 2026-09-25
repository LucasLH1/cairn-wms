import type { Migration } from 'kysely/migration';
import * as foundationJournal from './0001-foundation-journal.js';
import * as usersSessionsWorkstations from './0002-users-sessions-workstations.js';
import * as expectedReceipts from './0003-expected-receipts.js';

/**
 * Migrations dans leur ordre d'application (fiche 0021). Une migration publiée ne se modifie plus :
 * on en ajoute une nouvelle en fin de liste.
 */
export const migrations: Readonly<Record<string, Migration>> = {
  '0001-foundation-journal': foundationJournal,
  '0002-users-sessions-workstations': usersSessionsWorkstations,
  '0003-expected-receipts': expectedReceipts,
};
