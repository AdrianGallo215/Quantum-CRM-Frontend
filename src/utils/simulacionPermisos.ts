import type { Empleado, Oportunidad, Rol } from '@/types'

/**
 * Punto ÚNICO de decisión de acceso al módulo de Simulaciones.
 *
 * ⚠ Este es el único módulo del CRM donde el reparto de `analista` y `jdv` se
 * INVIERTE respecto al resto (`matriz_permisos.md` §2.15):
 *
 *   - `analista` es de solo lectura en oportunidades pero tiene escritura COMPLETA
 *     acá: es el rol dueño del módulo.
 *   - `jdv` es supervisor en oportunidades pero NO tiene ningún acceso acá.
 *
 * Por eso NO se reutilizan `ROLES_APOYO` ni `ROLES_SUPERVISION` de `authStore`:
 * la primera agrupa `analista` con `otro`, que acá están en extremos opuestos; la
 * segunda incluye a `jdv`, que acá no entra. El backend cometió exactamente este
 * error y tuvo que centralizar la decisión en un punto propio (`SimulacionPermisos`).
 *
 * Las constantes viven acá dentro a propósito: junto a las de `authStore` invitarían
 * a que alguien tomara la lista equivocada por parecido.
 *
 * Guards de UX, no de seguridad (`CLAUDE.md` regla 8): ocultar un botón no protege
 * nada — eso lo hace el backend, que responde 404 a los recursos ajenos (§23).
 */
const ROLES_MODULO_SIMULACIONES: Rol[] = ['admin', 'gerencia', 'analista']

/**
 * La Calculadora Financiera suma `vendedor` a la lista del módulo: entra a
 * calcular aunque NO entre al listado del módulo (§2.15). Son dos permisos
 * distintos y no se pueden colapsar en una sola constante (K17).
 */
const ROLES_CALCULADORA: Rol[] = ['admin', 'gerencia', 'analista', 'vendedor']

/**
 * Acceso al módulo de Simulaciones (listado propio del módulo).
 * `vendedor`, `jdv` y `otro` quedan fuera (§2.15).
 */
export function puedeVerModuloSimulaciones(empleado: Empleado | null): boolean {
  if (!empleado) return false
  return ROLES_MODULO_SIMULACIONES.includes(empleado.rol)
}

/**
 * Acceso a la Calculadora Financiera. Es el permiso MÁS amplio de los tres:
 * `vendedor` sí entra, a diferencia del módulo (§2.15).
 */
export function puedeUsarCalculadora(empleado: Empleado | null): boolean {
  if (!empleado) return false
  return ROLES_CALCULADORA.includes(empleado.rol)
}

/**
 * El simulador dentro de una oportunidad concreta. Para `vendedor` el permiso es
 * POR RECURSO: solo donde él es el vendedor asignado (§2.15). Para admin, gerencia
 * y analista, cualquiera.
 */
export function puedeSimularEnOportunidad(
  empleado: Empleado | null,
  oportunidad: Pick<Oportunidad, 'id_vendedor'>,
): boolean {
  if (!empleado) return false
  if (ROLES_MODULO_SIMULACIONES.includes(empleado.rol)) return true
  if (empleado.rol === 'vendedor') return oportunidad.id_vendedor === empleado.id
  return false
}
