import {
  useAuthStore,
  ROLES_REPORTES,
  ROLES_BANDEJA_GERENCIA,
  ROLES_SOLICITANTES,
  tieneRol,
} from '@/store/authStore'
import { puedeVerModuloSimulaciones, puedeUsarCalculadora } from '@/utils/simulacionPermisos'
import { RUTA_CALCULADORA, RUTA_SIMULACIONES } from '@/router/rutas'

export interface NavItem {
  to: string
  icono: string
  label: string
}

/**
 * Ítems de navegación principales, ya filtrados por el rol del usuario.
 *
 * Fuente única para el sidebar (desktop), el drawer del topbar mobile y —en su
 * subconjunto fijo— el BottomNavBar. Antes esta lista vivía inline en
 * `AppLayout`; al necesitarla también el drawer, se extrajo para que agregar
 * una pantalla no obligue a recordar dos lugares.
 */
export function useNavItems(): NavItem[] {
  const empleado = useAuthStore((s) => s.empleado)

  const items: NavItem[] = [
    { to: '/', icono: 'dashboard', label: 'Inicio' },
    { to: '/pipeline', icono: 'view_kanban', label: 'Pipeline' },
    { to: '/cartera', icono: 'account_balance_wallet', label: 'Cartera' },
    { to: '/contactos', icono: 'contacts', label: 'Contactos' },
    { to: '/prospeccion', icono: 'person_search', label: 'Prospección' },
    { to: '/actividades', icono: 'calendar_today', label: 'Actividades' },
  ]
  if (tieneRol(empleado, ROLES_REPORTES)) {
    items.push({ to: '/reportes', icono: 'monitoring', label: 'Reportes' })
  }
  if (tieneRol(empleado, ROLES_BANDEJA_GERENCIA)) {
    items.push({ to: '/gerencia', icono: 'fact_check', label: 'Gerencia' })
  }
  if (tieneRol(empleado, ROLES_SOLICITANTES)) {
    items.push({ to: '/solicitudes', icono: 'approval', label: 'Solicitudes' })
  }
  // El vendedor NO entra al módulo pero SÍ a la Calculadora: es el único
  // módulo del CRM con este reparto (matriz_permisos.md §2.15). La decisión
  // vive en `simulacionPermisos`, no acá — ver Plan 03 D11.
  if (puedeVerModuloSimulaciones(empleado)) {
    items.push({ to: RUTA_SIMULACIONES, icono: 'calculate', label: 'Simulaciones' })
  }
  if (puedeUsarCalculadora(empleado)) {
    items.push({ to: RUTA_CALCULADORA, icono: 'percent', label: 'Calculadora' })
  }
  return items
}
