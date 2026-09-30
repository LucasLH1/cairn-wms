import type { Migration } from 'kysely/migration';
import * as foundationJournal from './0001-foundation-journal.js';
import * as usersSessionsWorkstations from './0002-users-sessions-workstations.js';
import * as expectedReceipts from './0003-expected-receipts.js';
import * as locationsAndArrivals from './0004-locations-and-arrivals.js';
import * as organization from './0005-organization.js';
import * as roleTemplates from './0006-role-templates.js';
import * as parties from './0007-parties.js';
import * as itemCatalog from './0008-item-catalog.js';
import * as userLanguage from './0009-user-language.js';

/**
 * Migrations dans leur ordre d'application (fiche 0021). Une migration publiée ne se modifie plus :
 * on en ajoute une nouvelle en fin de liste.
 */
export const migrations: Readonly<Record<string, Migration>> = {
  '0001-foundation-journal': foundationJournal,
  '0002-users-sessions-workstations': usersSessionsWorkstations,
  '0003-expected-receipts': expectedReceipts,
  '0004-locations-and-arrivals': locationsAndArrivals,
  '0005-organization': organization,
  '0006-role-templates': roleTemplates,
  '0007-parties': parties,
  '0008-item-catalog': itemCatalog,
  '0009-user-language': userLanguage,
};
