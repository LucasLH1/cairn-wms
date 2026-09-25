// `pnpm dev:workstation` : donne le cookie du poste « Poste bureau 1 » du jeu de données, signé du
// secret du .env, à poser dans le navigateur de développement (outils de développement > Application
// > Cookies > http://localhost:5173). Tant que le jeu de données n'a pas d'utilisateur qui déclare
// les postes (#73), c'est ainsi qu'un navigateur local devient un poste déclaré. Local seulement.
import { createHmac } from 'node:crypto';
import { loadLocalEnvironment } from './local.mjs';

loadLocalEnvironment();
const workstationId = process.argv[2] ?? '0199f000-0000-7000-8000-000000000001';
const signature = createHmac('sha256', process.env.CAIRN_COOKIE_SECRET ?? '')
  .update(`workstation:${workstationId}`)
  .digest('base64url');
process.stdout.write(
  `Nom : cairn_workstation\nValeur : ${workstationId}.${signature}\nOptions : HttpOnly, Secure, SameSite=Strict, chemin /\n`,
);
