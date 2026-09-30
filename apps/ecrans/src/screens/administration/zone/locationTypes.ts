import { dockLocationTypes, locationTypeSchema, type LocationType, type ZonePurpose } from '@cairn/contrat';

/** Le type d'emplacement proposé d'office pour une zone : celui que sa vocation désigne. */
export const typeForPurpose: Readonly<Record<ZonePurpose, LocationType>> = {
  storage: 'reserve',
  picking: 'picking',
  receiving: 'receivingDock',
  shipping: 'shippingDock',
  preparation: 'preparation',
  consolidation: 'consolidation',
  quarantine: 'quarantine',
  dispute: 'dispute',
  workshop: 'workshop',
  destruction: 'destruction',
  virtual: 'virtual',
};

/** Les types d'un emplacement physique : un emplacement virtuel naît seul, dans sa zone (RG-EMP-039). */
export const physicalTypes = locationTypeSchema.options.filter((type) => type !== 'virtual');

/** Un emplacement de quai est rattaché à un quai de sa zone (RG-EMP-046). */
export const isDocked = (type: LocationType) => dockLocationTypes.includes(type);
