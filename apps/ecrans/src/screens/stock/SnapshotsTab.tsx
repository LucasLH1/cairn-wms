import { getSnapshot, listSnapshots } from '@cairn/contrat';
import { Banner, Button, DataTable, Panel, Select, StatusBadge, type StatusTone } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { contractQuery } from '../../contract/query.js';
import { useWorkingSite } from '../../shell/site.js';
import { formatDate } from '../format.js';

type SnapshotDay = z.infer<typeof listSnapshots.output>['days'][number];
type SnapshotLine = z.infer<typeof getSnapshot.output>['lines'][number];

const NONE = '—';
const NO_COMPARISON = 'none';

/** Une journée sans photo est non facturable, et doit se voir comme telle (RG-STK-061). */
const stateTones: Readonly<Record<SnapshotDay['state'], StatusTone>> = {
  complete: 'ok',
  failed: 'bad',
  absent: 'warn',
};

/**
 * Photos quotidiennes du site (0.4 § 6, « Superviseur — Consulter une photo quotidienne ») : chaque
 * jour avec son état ; une photo complète s'ouvre, par donneur d'ordre, référence, état qualité et
 * emplacement, et se compare à une autre date.
 */
export function SnapshotsTab() {
  const { t, i18n } = useTranslation();
  const site = useWorkingSite();
  const { data } = useQuery({
    ...contractQuery(listSnapshots, { siteId: site?.id ?? '' }),
    enabled: site !== undefined,
  });
  const [openedId, setOpenedId] = useState<string>();
  if (site === undefined) return <Banner tone="info">{t('stock.noSite')}</Banner>;
  const days = data?.days ?? [];
  const opened = days.find((day) => day.snapshotId === openedId);
  return (
    <>
      <Panel
        title={t('snapshot.list')}
        meta={data === undefined ? site.name : t('snapshot.meta', { time: data.snapshotTime })}
      >
        <DataTable<SnapshotDay>
          label={t('snapshot.list')}
          rows={days}
          rowKey={(day) => day.date}
          empty={null}
          columns={[
            {
              id: 'date',
              header: t('snapshot.date'),
              size: 'date',
              cell: (day) => formatDate(day.date, i18n.language),
            },
            {
              id: 'state',
              header: t('snapshot.state'),
              size: 'status',
              cell: (day) => (
                <StatusBadge tone={stateTones[day.state]}>{t(`snapshot.states.${day.state}`)}</StatusBadge>
              ),
            },
            {
              id: 'takenAt',
              header: t('snapshot.takenAt'),
              size: 'code',
              // L'heure du site, comme celle à laquelle la photo est réglée.
              cell: (day) =>
                day.takenAt === null
                  ? NONE
                  : new Intl.DateTimeFormat(i18n.language, {
                      hour: '2-digit',
                      minute: '2-digit',
                      hourCycle: 'h23',
                      timeZone: site.timeZone,
                    }).format(new Date(day.takenAt)),
            },
            {
              id: 'lines',
              header: t('snapshot.lines'),
              size: 'number',
              numeric: true,
              cell: (day) => day.lines,
            },
            {
              id: 'actions',
              header: '',
              size: 'text',
              cell: (day) =>
                day.state === 'complete' && day.snapshotId !== null ? (
                  <Button
                    onPress={() => {
                      setOpenedId(day.snapshotId ?? undefined);
                    }}
                  >
                    {t('snapshot.open')}
                  </Button>
                ) : null,
            },
          ]}
        />
      </Panel>
      {opened?.snapshotId == null ? null : (
        <SnapshotDetail
          key={opened.snapshotId}
          day={opened}
          snapshotId={opened.snapshotId}
          others={days.filter((day) => day.state === 'complete' && day.snapshotId !== opened.snapshotId)}
        />
      )}
    </>
  );
}

function SnapshotDetail({
  day,
  snapshotId,
  others,
}: {
  day: SnapshotDay;
  snapshotId: string;
  others: readonly SnapshotDay[];
}) {
  const { t, i18n } = useTranslation();
  const [comparedTo, setComparedTo] = useState<string | null>(null);
  const { data } = useQuery(contractQuery(getSnapshot, { snapshotId, comparedTo }));
  const title = t('snapshot.detailTitle', { date: formatDate(day.date, i18n.language) });
  const signed = (value: number | null) =>
    value === null ? NONE : value > 0 ? `+${String(value)}` : value < 0 ? `−${String(-value)}` : '0';
  return (
    <Panel
      title={title}
      meta={
        data?.comparedDate == null
          ? undefined
          : t('snapshot.comparedMeta', { date: formatDate(data.comparedDate, i18n.language) })
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Select
          label={t('snapshot.compareWith')}
          placeholder={t('snapshot.noComparison')}
          options={[
            { id: NO_COMPARISON, label: t('snapshot.noComparison') },
            ...others.flatMap((other) =>
              other.snapshotId === null
                ? []
                : [{ id: other.snapshotId, label: formatDate(other.date, i18n.language) }],
            ),
          ]}
          value={comparedTo ?? NO_COMPARISON}
          onChange={(value) => {
            setComparedTo(value === null || value === NO_COMPARISON ? null : value);
          }}
        />
      </div>
      <DataTable<SnapshotLine>
        label={title}
        rows={data?.lines ?? []}
        rowKey={(line) => `${line.principalCode}-${line.itemCode}-${line.qualityLabel}-${line.address}`}
        empty={t('snapshot.empty')}
        columns={[
          {
            id: 'principal',
            header: t('snapshot.principal'),
            size: 'code',
            code: true,
            cell: (line) => line.principalCode,
          },
          { id: 'item', header: t('snapshot.item'), size: 'code', code: true, cell: (line) => line.itemCode },
          { id: 'quality', header: t('snapshot.quality'), size: 'text', cell: (line) => line.qualityLabel },
          {
            id: 'address',
            header: t('snapshot.address'),
            size: 'code',
            code: true,
            cell: (line) => line.address,
          },
          {
            id: 'quantity',
            header: t('snapshot.quantity'),
            size: 'number',
            numeric: true,
            cell: (line) => line.quantity,
          },
          {
            id: 'handlingUnits',
            header: t('snapshot.handlingUnits'),
            size: 'number',
            numeric: true,
            cell: (line) => line.handlingUnits,
          },
          {
            id: 'volume',
            header: t('snapshot.volume'),
            size: 'number',
            numeric: true,
            cell: (line) => line.volumeCm3 ?? NONE,
          },
          ...(comparedTo === null
            ? []
            : [
                {
                  id: 'difference',
                  header: t('snapshot.difference'),
                  size: 'number' as const,
                  numeric: true,
                  cell: (line: SnapshotLine) => signed(line.difference),
                },
              ]),
        ]}
      />
    </Panel>
  );
}
