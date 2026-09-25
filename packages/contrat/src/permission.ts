import { z } from 'zod';

/**
 * Catalogue fermé des permissions élémentaires (RG-ORG-018) : chacune décrit un geste précis, jamais
 * un écran ni un module. Il s'étend avec les gestes que le produit livre.
 */
export const permissionSchema = z.enum(['declareWorkstation']);
export type Permission = z.infer<typeof permissionSchema>;
