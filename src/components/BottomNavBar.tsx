import { NavLink } from 'react-router-dom'
import type { NavItem } from './navItems'

/**
 * Barra de navegación inferior, solo mobile (`< 768px`). Implementa
 * `docs/DESIGN.md` §9.11.
 *
 * La lista es fija y deliberadamente NO se filtra por rol: son las 5 pantallas
 * que cualquier rol puede abrir. Reportes, Gerencia, Solicitudes y
 * Configuración —que sí dependen del rol— viven en el drawer de
 * `TopBarMobile`, para no tener una barra que cambie de tamaño según quién
 * inicie sesión.
 */
const ITEMS: NavItem[] = [
  { to: '/', icono: 'dashboard', label: 'Inicio' },
  { to: '/pipeline', icono: 'view_kanban', label: 'Pipeline' },
  { to: '/cartera', icono: 'account_balance_wallet', label: 'Cartera' },
  { to: '/prospeccion', icono: 'person_search', label: 'Prospección' },
  { to: '/actividades', icono: 'calendar_today', label: 'Actividades' },
]

export function BottomNavBar() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden h-16 bg-surface border-t border-outline-variant"
    >
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 transition-all ${
              isActive
                ? 'bg-secondary-container text-on-secondary-container rounded-full scale-95'
                : 'text-on-surface-variant'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">{item.icono}</span>
          <span className="text-[10px] font-semibold tracking-wide leading-none">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
