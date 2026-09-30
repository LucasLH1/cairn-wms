import {
  MAX_GENERATED_LOCATIONS,
  segmentValues,
  type AddressSegment,
  type SegmentRange,
} from '@cairn/contrat';

/** Une adresse produite par le générateur : ses segments, et l'adresse affichée. */
export interface GeneratedAddress {
  readonly segments: readonly string[];
  readonly address: string;
}

export type GenerationProblem = 'rangeOutsidePattern' | 'tooManyLocations';

/** Un motif d'exclusion : l'adresse exacte, ou avec `*` pour toute suite de signes (RG-EMP-021). */
export function excludes(patterns: readonly string[]): (address: string) => boolean {
  const expressions = patterns.map(
    (pattern) =>
      new RegExp(
        `^${pattern
          .toUpperCase()
          .split('*')
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
          .join('.*')}$`,
        'u',
      ),
  );
  return (address) => expressions.some((expression) => expression.test(address.toUpperCase()));
}

/**
 * Les adresses décrites, dans l'ordre de parcours (RG-EMP-014) : le premier segment est l'allée, le
 * deuxième la travée ; en circulation alternée, une allée sur deux se parcourt à rebours (serpentin,
 * RG-EMP-016). Au-delà de la borne, la génération se découpe (0.3 § 5).
 */
export function generateAddresses(
  pattern: readonly AddressSegment[],
  separator: string,
  ranges: readonly SegmentRange[],
  alternating: boolean,
): GeneratedAddress[] | GenerationProblem {
  if (ranges.length !== pattern.length) return 'rangeOutsidePattern';
  const values: string[][] = [];
  for (const [index, segment] of pattern.entries()) {
    const range = ranges[index];
    const list = range === undefined ? undefined : segmentValues(segment, range);
    if (list === undefined || list.length === 0) return 'rangeOutsidePattern';
    values.push(list);
  }
  if (values.reduce((count, list) => count * list.length, 1) > MAX_GENERATED_LOCATIONS)
    return 'tooManyLocations';
  const addresses: GeneratedAddress[] = [];
  const walk = (depth: number, prefix: readonly string[], aisle: number) => {
    const level = values[depth];
    if (level === undefined) {
      addresses.push({ segments: prefix, address: prefix.join(separator) });
      return;
    }
    const reversed = alternating && depth === 1 && aisle % 2 === 1;
    const ordered = reversed ? [...level].reverse() : level;
    ordered.forEach((value, index) => {
      walk(depth + 1, [...prefix, value], depth === 0 ? index : aisle);
    });
  };
  walk(0, [], 0);
  return addresses;
}
