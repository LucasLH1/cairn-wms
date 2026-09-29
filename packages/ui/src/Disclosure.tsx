import type { ReactNode } from 'react';
import { Button, Disclosure as AriaDisclosure, DisclosurePanel, Heading } from 'react-aria-components';
import { focusRing } from './focus.js';

export interface DisclosureProps {
  readonly title: string;
  readonly children: ReactNode;
}

/** Section repliée par défaut : ce qui est une exception, pas une étape normale (0.1, restrictions). */
export function Disclosure({ title, children }: DisclosureProps) {
  return (
    <AriaDisclosure className="group grid gap-3">
      <Heading className="m-0">
        <Button
          slot="trigger"
          className={`${focusRing} flex cursor-pointer items-center gap-2 text-small font-semibold tracking-label text-text-3 uppercase`}
        >
          <span aria-hidden="true" className="transition-transform group-data-expanded:rotate-90">
            ▸
          </span>
          {title}
        </Button>
      </Heading>
      <DisclosurePanel className="grid gap-3">{children}</DisclosurePanel>
    </AriaDisclosure>
  );
}
