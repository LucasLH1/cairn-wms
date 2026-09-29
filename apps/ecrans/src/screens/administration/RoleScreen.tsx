import {
  deleteRole,
  listRoles,
  permissionCatalog,
  permissionDomains,
  roleNatureSchema,
  saveRole,
  type Permission,
  type RoleNature,
  type RoleRow,
} from '@cairn/contrat';
import { Banner, Button, ChipGroup, Panel, Select, TextField } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../../contract/query.js';
import { RefusalBanner } from '../../contract/RefusalBanner.js';
import { useGesture } from '../../contract/useGesture.js';

const isPermission = (value: string): value is Permission =>
  permissionDomains.some((domain) => (permissionCatalog[domain] as readonly string[]).includes(value));

/**
 * Fiche rôle (0.1, parcours « Composer un rôle ») : libellé, nature, puis le catalogue des permissions
 * groupé par domaine ; chaque permission est formulée comme un geste.
 */
export function RoleScreen() {
  const { roleId } = useParams({ from: '/shell/administration/roles/$roleId' });
  const { data } = useQuery(contractQuery(listRoles, {}));
  if (data === undefined) return null;
  return <RoleForm key={roleId} role={data.roles.find((role) => role.id === roleId)} />;
}

function RoleForm({ role }: { role: RoleRow | undefined }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const gesture = useGesture();
  const [name, setName] = useState(role?.name ?? '');
  const [nature, setNature] = useState<RoleNature>(role?.nature ?? 'operational');
  const [permissions, setPermissions] = useState<readonly Permission[]>(role?.permissions ?? []);

  const save = async () => {
    const saved = await gesture.run(saveRole, {
      roleId: role?.id ?? null,
      name,
      nature,
      permissions: [...permissions],
    });
    if (saved !== undefined && role === undefined) {
      await navigate({ to: '/administration/roles/$roleId', params: { roleId: saved.roleId } });
    }
  };

  return (
    <>
      <RefusalBanner refusal={gesture.refusal} onDismiss={gesture.dismiss} />
      {role !== undefined && role.holderCount > 0 ? (
        <Banner tone="info">{t('role.heldBy', { count: role.holderCount })}</Banner>
      ) : null}
      <Panel
        title={role === undefined ? t('role.newTitle') : role.name}
        actions={
          role === undefined || role.holderCount > 0 ? undefined : (
            <Button
              onPress={() =>
                void gesture.run(deleteRole, { roleId: role.id }).then((result) => {
                  if (result !== undefined) void navigate({ to: '/administration/users' });
                })
              }
            >
              {t('role.delete')}
            </Button>
          )
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <TextField label={t('role.name')} value={name} onChange={setName} />
          <Select
            label={t('role.nature')}
            placeholder={t('expectedReceipt.choose')}
            options={roleNatureSchema.options.map((option) => ({
              id: option,
              label: t(`role.natures.${option}`),
            }))}
            value={nature}
            onChange={(value) => {
              const parsed = roleNatureSchema.safeParse(value);
              if (parsed.success) setNature(parsed.data);
            }}
          />
        </div>
        <span>{t('role.natureHint')}</span>
        {permissionDomains.map((domain) => (
          <ChipGroup
            key={domain}
            label={t(`permissionDomain.${domain}`)}
            options={permissionCatalog[domain].map((permission) => ({
              id: permission,
              label: t(`permission.${permission}`),
            }))}
            value={permissions.filter((permission) =>
              (permissionCatalog[domain] as readonly string[]).includes(permission),
            )}
            onChange={(selected) => {
              const others = permissions.filter(
                (permission) => !(permissionCatalog[domain] as readonly string[]).includes(permission),
              );
              setPermissions([...others, ...selected.filter(isPermission)]);
            }}
          />
        ))}
        <div className="flex justify-end">
          <Button
            variant="primary"
            isDisabled={name.trim() === '' || gesture.sending}
            onPress={() => void save()}
          >
            {role === undefined ? t('role.create') : t('common.save')}
          </Button>
        </div>
      </Panel>
    </>
  );
}
