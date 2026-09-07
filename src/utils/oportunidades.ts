import type { OportunidadItem } from '@/types'

/**
 * Etiqueta del modelo para listados. Con un ítem, el código a secas — el caso de
 * hoy en producción. Con varios, "K12 +2": mostrar solo el primero sería
 * presentar un modelo como si fuera toda la operación (D3).
 */
export function etiquetaModelos(items: readonly OportunidadItem[]): string {
  // Desestructurar en vez de indexar: con `noUncheckedIndexedAccess`, `items[0]`
  // tipa como `OportunidadItem | undefined` y el guard de `.length` no lo estrecha.
  const [primero, ...resto] = items
  if (!primero) return '—'
  return resto.length === 0 ? primero.modelo.codigo : `${primero.modelo.codigo} +${resto.length}`
}
