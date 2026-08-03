import {
  useAuthStore,
  ROLES_REPORTES,
  ROLES_BANDEJA_GERENCIA,
  ROLES_SOLICITANTES,
  tieneRol,
} from '@/store/authStore'

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
  return items
}
