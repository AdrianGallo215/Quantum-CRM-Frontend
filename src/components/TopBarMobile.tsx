import { useState } from 'react'
import { Drawer } from 'antd'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { iniciales, nombreCompleto } from '@/utils/formato'
import { NotificacionesDropdown } from './NotificacionesDropdown'
import { useNavItems } from './navItems'

/**
 * Topbar de mobile (`< 768px`). El sidebar de desktop no cabe a este ancho, así
 * que la navegación completa se mueve a un Drawer lateral que abre la
 * hamburguesa; el BottomNavBar cubre aparte los 5 accesos frecuentes.
 *
 * El buscador se muestra colapsado como una lupa y se expande al tocarlo: a
 * 375px no caben a la vez el input, las notificaciones y el avatar.
 */
export function TopBarMobile() {
  const empleado = useAuthStore((s) => s.empleado)
  const logout = useLogout()
  const navigate = useNavigate()
  const items = useNavItems()
  const [drawerAbierto, setDrawerAbierto] = useState(false)
  const [buscadorAbierto, setBuscadorAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const cerrarDrawer = () => setDrawerAbierto(false)

  const buscar = (e: React.FormEvent) => {
    e.preventDefault()
    const q = busqueda.trim()
    if (q.length === 0) return
    navigate(`/cartera?q=${encodeURIComponent(q)}`)
    setBuscadorAbierto(false)
  }

  return (
    <>
      <header className="flex md:hidden h-16 shrink-0 items-center justify-between gap-2 px-4 bg-white border-b border-outline-variant/30">
        {buscadorAbierto ? (
          <form className="flex items-center gap-2 w-full" role="search" onSubmit={buscar}>
            <label className="sr-only" htmlFor="buscador-mobile">
              Buscar empresa por razón social o RUC
            </label>
            <input
              id="buscador-mobile"
              autoFocus
              className="flex-1 min-w-0 bg-surface-container-low border-none rounded-pill px-4 py-2 text-body-sm focus:ring-2 focus:ring-brand-primary/20"
              placeholder="Razón social o RUC…"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button
              type="button"
              className="p-2 text-on-surface-variant shrink-0"
              aria-label="Cerrar búsqueda"
              onClick={() => setBuscadorAbierto(false)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              className="p-2 -ml-2 text-on-surface shrink-0"
              aria-label="Abrir menú de navegación"
              onClick={() => setDrawerAbierto(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <img
              alt="Quantum Investment"
              className="h-7 object-contain"
              src="/logo-quantum.png"
            />

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                className="p-2 text-on-surface-variant"
                aria-label="Buscar empresa"
                onClick={() => setBuscadorAbierto(true)}
              >
                <span className="material-symbols-outlined">search</span>
              </button>
              <NotificacionesDropdown />
              <div
                className="w-9 h-9 rounded-pill bg-brand-secondary/30 flex items-center justify-center border-2 border-brand-secondary/20 text-brand-tertiary font-bold text-xs shrink-0"
                title={nombreCompleto(empleado)}
              >
                {iniciales(empleado?.nombres, empleado?.apellidos)}
              </div>
            </div>
          </>
        )}
      </header>

      <Drawer
        placement="left"
        open={drawerAbierto}
        onClose={cerrarDrawer}
        width={280}
        closable={false}
        styles={{ body: { padding: 0 } }}
        className="md:hidden"
      >
        <div className="flex flex-col h-full bg-primary text-white">
          <div className="flex items-center justify-between px-6 pt-6 pb-8">
            <img
              alt="Quantum Investment"
              className="h-9 object-contain brightness-0 invert"
              src="/logo-quantum.png"
            />
            <button
              type="button"
              className="p-2 rounded-md text-white/80"
              aria-label="Cerrar menú"
              onClick={cerrarDrawer}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <nav className="flex-1 flex flex-col px-4 gap-1 overflow-y-auto">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={cerrarDrawer}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-6 py-3 font-body-md text-body-md transition-all ${
                    isActive ? 'sidebar-active-gradient font-bold text-white' : 'opacity-70'
                  }`
                }
              >
                <span className="material-symbols-outlined">{item.icono}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10 flex flex-col gap-1">
            {empleado?.rol === 'admin' && (
              <NavLink
                to="/admin"
                onClick={cerrarDrawer}
                className="flex items-center gap-3 rounded-md px-6 py-3 text-body-md text-white opacity-70"
              >
                <span className="material-symbols-outlined">settings</span>
                Configuración
              </NavLink>
            )}
            <button
              type="button"
              className="flex items-center gap-3 rounded-md px-6 py-3 text-body-md text-white opacity-70 text-left"
              onClick={() => {
                cerrarDrawer()
                logout()
              }}
            >
              <span className="material-symbols-outlined">logout</span>
              Cerrar sesión
            </button>
          </div>
        </div>
      </Drawer>
    </>
  )
}
