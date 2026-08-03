import { useLocation } from 'react-router-dom'
import { tieneRol, useAuthStore } from '@/store/authStore'
import type { Rol } from '@/types'

/**
 * URL del cotizador (sistema externo).
 *
 * El valor por defecto es el servidor actual, así que el botón funciona sin
 * configurar nada. `VITE_COTIZADOR_URL` solo sirve para apuntar a otro servidor
 * sin recompilar el código.
 *
 * ⚠️ El default va por `http://` (el cotizador no expone TLS hoy). Cuando el CRM
 * se sirva por HTTPS, el navegador marcará la navegación como insegura; en
 * cuanto el cotizador tenga certificado, basta con cambiar esta constante o
 * definir la variable de entorno con https://.
 */
const COTIZADOR_URL =
  import.meta.env.VITE_COTIZADOR_URL?.trim() || 'http://quantum.okserver43.com/app/modulos/cotizacion/'
const ROLES_COTIZADOR: Rol[] = ['vendedor', 'jdv', 'gerencia']

function enRutaCotizable(pathname: string): boolean {
  return pathname === '/pipeline' || pathname.startsWith('/oportunidades/')
}

/** FAB circular que se expande al hover para abrir el cotizador (sistema externo) en otra ventana. */
export function CotizadorFab() {
  const empleado = useAuthStore((s) => s.empleado)
  const { pathname } = useLocation()

  if (!tieneRol(empleado, ROLES_COTIZADOR) || !enRutaCotizable(pathname)) return null

  return (
    <button
      type="button"
      onClick={() => window.open(COTIZADOR_URL, '_blank', 'noopener,noreferrer')}
      title="Abrir cotizador"
      className="group absolute bottom-[88px] md:bottom-6 right-6 z-40 flex h-14 w-14 items-center gap-3 overflow-hidden rounded-full bg-brand-primary pl-4 text-white shadow-xl transition-[width] duration-300 ease-out hover:w-48 hover:shadow-2xl"
    >
      <span className="material-symbols-outlined shrink-0 text-2xl">request_quote</span>
      <span className="whitespace-nowrap text-sm font-bold opacity-0 transition-opacity delay-100 duration-200 group-hover:opacity-100">
        Abrir cotizador
      </span>
    </button>
  )
}
