import { search, type SearchResult } from '@cairn/contrat';
import { Banner, DataTable, Panel, StatusBadge } from '@cairn/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { contractQuery } from '../contract/query.js';
import { RouteLink } from '../shell/RouteLink.js';
import { useHasPermission } from '../shell/site.js';

/**
 * Résultats de l'entrée de recherche unique (RG-SUR-059, 062). Une lecture hors mission ouvre l'objet
 * qu'elle désigne (RG-SUR-060) ; un code inconnu le dit, jamais d'écran vide (RG-SUR-063) ; un objet
 * hors du périmètre est signalé avec son donneur d'ordre et son site, rien d'autre (RG-SUR-064).
 */
export function SearchScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { q, scan } = useSearch({ from: '/shell/search' });
  const { data } = useQuery({ ...contractQuery(search, { text: q }), enabled: q.trim() !== '' });
  const items = useHasPermission('manageItems');
  const draftItems = useHasPermission('createDraftItem');
  const principalParties = useHasPermission('managePrincipalParties');
  const providerParties = useHasPermission('administerProviderParties');
  const mergeParties = useHasPermission('mergeEndCustomers');
  const anonymizeParties = useHasPermission('anonymizeEndCustomers');
  // Une fiche ne s'ouvre qu'à qui peut la consulter ; les autres voient le résultat, sans lien.
  const canOpen = (result: SearchResult): boolean => {
    if (result.outOfScope) return false;
    switch (result.type) {
      case 'item':
        return items || draftItems;
      case 'party':
        return principalParties || providerParties || mergeParties || anonymizeParties;
      case 'expectedReceipt':
        return true;
    }
  };
  const opened = data?.results.filter((result) => result.exact && canOpen(result));
  const single = scan && opened?.length === 1 ? opened[0] : undefined;

  useEffect(() => {
    if (single === undefined) return;
    const target =
      single.type === 'item'
        ? { to: '/items/$itemId' as const, params: { itemId: single.id } }
        : single.type === 'party'
          ? { to: '/parties/$partyId' as const, params: { partyId: single.id } }
          : {
              to: '/expected-receipts/$expectedReceiptId' as const,
              params: { expectedReceiptId: single.id },
            };
    void navigate({ ...target, replace: true });
  }, [single, navigate]);

  const link = (result: SearchResult) => {
    const code = result.code ?? '—';
    if (!canOpen(result)) return code;
    switch (result.type) {
      case 'item':
        return (
          <RouteLink to="/items/$itemId" params={{ itemId: result.id }}>
            {code}
          </RouteLink>
        );
      case 'party':
        return (
          <RouteLink to="/parties/$partyId" params={{ partyId: result.id }}>
            {code}
          </RouteLink>
        );
      case 'expectedReceipt':
        return (
          <RouteLink to="/expected-receipts/$expectedReceiptId" params={{ expectedReceiptId: result.id }}>
            {code}
          </RouteLink>
        );
    }
  };

  if (data === undefined) return null;
  return (
    <>
      {data.results.length === 0 ? <Banner tone="info">{t('search.unknown', { text: q })}</Banner> : null}
      <Panel title={t('search.results')} meta={q}>
        <DataTable<SearchResult>
          label={t('search.results')}
          rows={data.results}
          rowKey={(result) => `${result.type}-${result.id}`}
          empty={t('search.unknown', { text: q })}
          columns={[
            {
              id: 'type',
              header: t('search.object'),
              size: 'date',
              cell: (result) => t(`search.types.${result.type}`),
            },
            { id: 'code', header: t('search.code'), size: 'text', code: true, cell: link },
            {
              id: 'name',
              header: t('search.name'),
              size: 'text',
              cell: (result) => result.label ?? '—',
            },
            {
              id: 'principal',
              header: t('search.principal'),
              size: 'code',
              cell: (result) => result.principalCode ?? '—',
            },
            { id: 'site', header: t('search.site'), size: 'code', cell: (result) => result.siteCode ?? '—' },
            {
              id: 'flags',
              header: '',
              size: 'status',
              cell: (result) =>
                result.outOfScope ? (
                  <StatusBadge tone="mute">{t('search.outOfScope')}</StatusBadge>
                ) : result.inactiveCode ? (
                  <StatusBadge tone="warn">{t('search.inactiveCode')}</StatusBadge>
                ) : null,
            },
          ]}
        />
      </Panel>
    </>
  );
}
