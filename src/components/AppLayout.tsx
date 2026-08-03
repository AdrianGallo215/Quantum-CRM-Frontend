import { useState } from 'react'
import { Dropdown, Tooltip } from 'antd'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { iniciales, nombreCompleto } from '@/utils/formato'
import { ETIQUETA_ROL } from '@/utils/etiquetas'
import { NotificacionesDropdown } from './NotificacionesDropdown'
import { CotizadorFab } from './CotizadorFab'
import { useNavItems } from './navItems'
import { BottomNavBar } from './BottomNavBar'
import { TopBarMobile } from './TopBarMobile'

const SIDEBAR_COLAPSADO_KEY = 'sidebar-colapsado'

/**
 * Shell copiado del prototipo Stitch `pipeline_kanban_etapas_personalizadas`:
 * sidebar navy 280px con curva, item activo con gradiente + borde cian,
 * topbar blanca con buscador global y usuario.
 */
export function AppLayout() {
  const empleado = useAuthStore((s) => s.empleado)
  const logout = useLogout()
  const navigate = useNavigate()
  const [colapsado, setColapsado] = useState(
    () => localStorage.getItem(SIDEBAR_COLAPSADO_KEY) === '1',
  )
  const [busqueda, setBusqueda] = useState('')

  const toggleColapsado = () => {
    setColapsado((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_COLAPSADO_KEY, next ? '1' : '0')
      return next
    })
  }

  const items = useNavItems()

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar (prototipo pipeline) */}
      <aside
        className={`hidden md:flex flex-col h-full ${colapsado ? 'w-20' : 'w-sidebar-width'} bg-primary text-white z-50 rounded-sidebar-curve shrink-0 shadow-xl overflow-hidden transition-all duration-200`}
      >
        <div className={`flex items-center ${colapsado ? 'justify-center px-0' : 'justify-between px-8'} pt-8 pb-10`}>
          {/* Es EL MISMO logo de siempre, descargado del CDN y servido desde
              /public. Antes se pedía a lh3.googleusercontent.com: una URL
              temporal generada por el prototipo de Stitch que, si Google la
              retira, deja la app sin marca en producción —y que además filtra
              el referrer a un tercero en cada carga.
              `brightness-0 invert` se conserva: el PNG original es oscuro y se
              pinta en blanco sobre el sidebar navy. */}
          {!colapsado && (
            <img
              alt="Quantum Investment"
              className="h-10 object-contain brightness-0 invert"
              src="/logo-quantum.png"
            />
          )}
          <button
            className="p-2 rounded-md hover:bg-white/10 transition-colors text-white/80 hover:text-white shrink-0"
            onClick={toggleColapsado}
            title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
          >
            <span className="material-symbols-outlined">
              {colapsado ? 'menu' : 'menu_open'}
            </span>
          </button>
        </div>
        <nav className="flex-1 flex flex-col px-4 gap-1">
          {items.map((item) => {
            const link = (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md transition-all font-body-md text-body-md ${
                    colapsado ? 'justify-center px-0 py-3' : 'px-6 py-3'
                  } ${
                    isActive
                      ? 'sidebar-active-gradient font-bold text-white'
                      : 'hover:bg-white/10 opacity-70'
                  }`
                }
              >
                <span className="material-symbols-outlined">{item.icono}</span>
                {!colapsado && <span>{item.label}</span>}
              </NavLink>
            )
            return colapsado ? (
              <Tooltip key={item.to} title={item.label} placement="right">
                {link}
              </Tooltip>
            ) : (
              link
            )
          })}
        </nav>
        {/* "Levantar Ticket" (prototipo Stitch) se eliminó: solo navegaba a
            /pipeline, duplicando el enlace del menú con un nombre que no
            corresponde a ningún concepto de este CRM.
            "Configuración" ahora solo se muestra a admin: al resto le aparecía
            un ítem apagado que no llevaba a ninguna parte. */}
        {empleado?.rol === 'admin' && (
          <div className="p-6 border-t border-white/10">
            <NavLink
              className={`flex items-center gap-3 rounded-md hover:bg-white/5 opacity-70 hover:opacity-100 text-xs text-white transition-opacity ${colapsado ? 'justify-center px-0 py-2' : 'px-6 py-2'}`}
              to="/admin"
              title="Configuración"
            >
              <span className="material-symbols-outlined text-sm">settings</span>
              {!colapsado && 'Configuración'}
            </NavLink>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <TopBarMobile />
        {/* Top Bar (prototipo pipeline) */}
        <header className="hidden md:flex h-16 shrink-0 items-center justify-between px-8 bg-white border-b border-outline-variant/30">
          <div className="flex items-center flex-1 max-w-xl">
            {/* Antes este input descartaba el texto y navegaba a /cartera a secas.
                Ahora lleva la búsqueda en la URL y Cartera la aplica al cargar. */}
            <form
              className="relative w-full"
              role="search"
              onSubmit={(e) => {
                e.preventDefault()
                const q = busqueda.trim()
                if (q.length === 0) return
                navigate(`/cartera?q=${encodeURIComponent(q)}`)
              }}
            >
              <label className="sr-only" htmlFor="buscador-global">
                Buscar empresa por razón social o RUC
              </label>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                id="buscador-global"
                className="w-full bg-surface-container-low border-none rounded-pill pl-10 pr-4 py-2 text-body-sm focus:ring-2 focus:ring-brand-primary/20"
                placeholder="Buscar empresa por razón social o RUC…"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </form>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <NotificacionesDropdown />
            </div>
            <div className="h-8 w-px bg-outline-variant"></div>
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'logout', label: 'Cerrar sesión', danger: true, onClick: logout },
                ],
              }}
            >
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="text-right">
                  <p className="font-body-md text-on-surface font-bold">
                    {empleado?.nombres ?? '—'}
                  </p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                    {empleado ? ETIQUETA_ROL[empleado.rol] : ''}
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-pill bg-brand-secondary/30 flex items-center justify-center border-2 border-brand-secondary/20 overflow-hidden text-brand-tertiary font-bold text-sm"
                  title={nombreCompleto(empleado)}
                >
                  {iniciales(empleado?.nombres, empleado?.apellidos)}
                </div>
              </div>
            </Dropdown>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-16 md:pb-0">
          <Outlet />
        </div>
        <CotizadorFab />
        <BottomNavBar />
      </main>
    </div>
  )
}
