import type { Rol, RolAprobador, Solicitud } from '@/types'
import { nombreCompleto } from './formato'

/**
 * Tabla de límites del contrato §2 — SOLO para UX proactiva (avisos antes de
 * enviar). La validación autoritativa es del backend: siempre manejar el 422.
 */
export function limiteDctoDirecto(rol: Rol): number | null {
  switch (rol) {
    case 'vendedor':
      return 3
    case 'jdv':
      return 7
    case 'gerencia':
    case 'admin':
      return null // sin límite
    case 'analista':
    case 'otro':
      // Roles de apoyo (contrato §25, PR backend #9, 2026-08-20): no aplican
      // descuento por ninguna vía, ni directo ni por solicitud. `analista`
      // tenía 3 antes de ese cambio; perdió el margen al pasar a rol de apoyo.
      return 0
  }
}

/** Quién aprobaría un dcto dado para este rol, según §2. null = no requiere solicitud. */
export function aprobadorParaDcto(rol: Rol, dcto: number): RolAprobador | null {
  const limite = limiteDctoDirecto(rol)
  if (limite === null || dcto <= limite) return null
  if ((rol === 'vendedor' || rol === 'analista') && dcto <= 7) return 'jdv'
  return 'gerencia'
}

/** Payload legible por fila de bandeja (contrato §5): "5% de descuento" / "Reasignar a Juan Pérez" */
export function descripcionPayloadSolicitud(s: Solicitud): string {
  if (s.tipo === 'descuento') {
    return `${Number(s.dcto_solicitado ?? 0)}% de descuento`
  }
  return `Reasignar a ${nombreCompleto(s.vendedor_nuevo)}`
}

/**
 * Determina si el usuario actual puede aprobar/denegar esta fila en la vista
 * unificada de /solicitudes (decisión D1, 2026-07-16). Una solicitud es
 * accionable por el usuario si sigue pendiente y su rol es el rol_aprobador
 * — para vendedor/analista esto nunca es true (nunca son aprobadores),
 * así que ven la lista en modo solo-lectura sin ramas de código extra.
 */
export function puedeResolverSolicitud(s: Solicitud, rol: Rol | undefined): boolean {
  return s.estado === 'pendiente' && rol !== undefined && s.rol_aprobador === rol
}
