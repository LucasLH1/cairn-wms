import { zodResolver } from '@hookform/resolvers/zod';
import {
  useForm,
  type ControllerRenderProps,
  type DefaultValues,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import type { z } from 'zod';

/**
 * Formulaire d'un geste (fiche 0025) : React Hook Form, validé par le schéma d'entrée du geste tiré du
 * contrat, celui-là même que le serveur applique. Le bouton qui l'envoie attend un formulaire valide.
 */
export function useGestureForm<Values extends FieldValues, Parsed extends FieldValues>(
  definition: { readonly input: z.ZodType<Parsed, Values> },
  defaultValues: DefaultValues<Values>,
) {
  return useForm<Values, unknown, Parsed>({
    resolver: zodResolver(definition.input),
    mode: 'onChange',
    defaultValues,
  });
}

/**
 * Un champ de texte relié au formulaire ; un texte facultatif vide vaut `null`, comme au contrat.
 * `compact` retire tout blanc à la frappe : une adresse électronique collée avec une espace reste valable.
 */
export function textField<Values extends FieldValues, Name extends FieldPath<Values>>(
  field: ControllerRenderProps<Values, Name>,
  options: { readonly optional?: boolean; readonly compact?: boolean } = {},
) {
  const value: unknown = field.value;
  return {
    name: field.name,
    value: typeof value === 'string' ? value : '',
    onBlur: field.onBlur,
    onChange: (typed: string) => {
      const text = options.compact === true ? typed.replace(/\s/gu, '') : typed;
      field.onChange(options.optional === true && text.trim() === '' ? null : text);
    },
  };
}

/** Un champ numérique ou de choix relié au formulaire : la valeur passe telle quelle. */
export function valueField<Values extends FieldValues, Name extends FieldPath<Values>>(
  field: ControllerRenderProps<Values, Name>,
) {
  return { value: field.value, onChange: field.onChange };
}
