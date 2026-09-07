import type { OportunidadItem } from '@/types'

/**
 * Etiqueta del modelo para listados. Con un ítem, el código a secas — el caso de
 * hoy en producción. Con varios, "K12 +2": mostrar solo el primero sería
 * presentar un modelo como si fuera toda la operación (D3).
 */
export function etiquetaModelos(items: readonly OportunidadItem[]): string {
  if (items.length === 0) return '—'
  const primero = items[0].modelo.codigo
  return items.length === 1 ? primero : `${primero} +${items.length - 1}`
}
