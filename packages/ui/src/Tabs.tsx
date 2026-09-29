import type { ReactNode } from 'react';
import { Tab, TabList, TabPanel, Tabs as AriaTabs } from 'react-aria-components';
import { focusRing } from './focus.js';

export interface TabsProps {
  readonly label: string;
  readonly tabs: readonly { readonly id: string; readonly label: string; readonly content: ReactNode }[];
  readonly selected?: string;
  readonly onSelectionChange?: (id: string) => void;
}

/** Onglets segmentés de la maquette (« À traiter » / « Traités ») : un puits, l'onglet choisi en relief. */
export function Tabs({ label, tabs, selected, onSelectionChange }: TabsProps) {
  return (
    <AriaTabs
      className="grid gap-4"
      {...(selected === undefined ? {} : { selectedKey: selected })}
      onSelectionChange={(key) => onSelectionChange?.(String(key))}
    >
      <TabList
        aria-label={label}
        className="flex w-fit gap-1 rounded-banner border border-border-tabs bg-well p-1"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            id={tab.id}
            className={`${focusRing} cursor-pointer rounded-chip px-4 py-2 text-body font-medium whitespace-nowrap text-text-secondary data-selected:bg-selected data-selected:text-text-strong`}
          >
            {tab.label}
          </Tab>
        ))}
      </TabList>
      {tabs.map((tab) => (
        <TabPanel key={tab.id} id={tab.id} className="grid gap-4 outline-none">
          {tab.content}
        </TabPanel>
      ))}
    </AriaTabs>
  );
}
