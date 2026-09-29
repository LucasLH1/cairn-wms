import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createDatabase, readApplicationConnection } from './socle/database/index.js';
import { hashPassword } from './socle/user/index.js';

/**
 * Premier administrateur d'une instance neuve (`pnpm instance:administrator`) : un compte portant le
 * rôle modèle Administrateur, rattaché à aucun site ; il crée ensuite les sites et les utilisateurs.
 * Refusé dès qu'un utilisateur actif administre les rôles : ce n'est pas un accès de secours.
 * Le mot de passe est tiré au hasard et affiché une fois ; il n'est écrit nulle part.
 */
const input = z
  .object({ CAIRN_ADMINISTRATOR_LOGIN: z.string().min(1), CAIRN_ADMINISTRATOR_NAME: z.string().min(1) })
  .parse(process.env);
const db = createDatabase(readApplicationConnection(process.env), 1);
try {
  const password = randomBytes(18).toString('base64url');
  await db.transaction().execute(async (transaction) => {
    const existing = await transaction
      .selectFrom('foundation.user as user')
      .innerJoin('foundation.userRole as userRole', 'userRole.userId', 'user.id')
      .innerJoin('foundation.rolePermission as rolePermission', 'rolePermission.roleId', 'userRole.roleId')
      .select('user.id')
      .where('user.active', '=', true)
      .where('rolePermission.permission', '=', 'administerRoles')
      .executeTakeFirst();
    if (existing !== undefined) throw new Error('an active role administrator already exists');
    const role = await transaction
      .selectFrom('foundation.role')
      .select('id')
      .where('template', '=', 'administrator')
      .executeTakeFirstOrThrow(() => new Error('the Administrateur template role is missing'));
    const user = await transaction
      .insertInto('foundation.user')
      .values({
        loginName: input.CAIRN_ADMINISTRATOR_LOGIN,
        displayName: input.CAIRN_ADMINISTRATOR_NAME,
        passwordHash: await hashPassword(password),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await transaction
      .insertInto('foundation.userRole')
      .values({ userId: user.id, roleId: role.id })
      .execute();
  });
  process.stdout.write(
    `Administrateur « ${input.CAIRN_ADMINISTRATOR_LOGIN} » créé. Mot de passe, affiché une seule fois : ${password}\n`,
  );
} finally {
  await db.destroy();
}
