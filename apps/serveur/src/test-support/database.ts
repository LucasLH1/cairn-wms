import { inject } from 'vitest';
import {
  APPLICATION_ROLE,
  createDatabase,
  type ConnectionSettings,
  type Database,
} from '../socle/database/index.js';

/** Connexion sous le rôle de l'application, celui des deux rôles du serveur. */
export function applicationConnection(): ConnectionSettings {
  const settings = inject('migrationSettings');
  return { ...settings.owner, user: APPLICATION_ROLE, password: settings.applicationPassword };
}

/** Connexion d'administration : sert à prouver ce que la base refuse, quel que soit le rôle. */
export function adminConnection(): ConnectionSettings {
  return inject('migrationSettings').admin;
}

export function openApplicationDatabase(): Database {
  return createDatabase(applicationConnection(), 2);
}

export function openAdminDatabase(): Database {
  return createDatabase(adminConnection(), 1);
}
