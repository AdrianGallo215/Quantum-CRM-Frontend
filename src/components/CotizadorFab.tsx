import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ROLES_COTIZADOR, tieneRol, useAuthStore } from '@/store/authStore'
import { COTIZADORES, enRutaCotizable } from '@/utils/cotizadores'
import type { Cotizador } from '@/utils/cotizadores'

const ID_PANEL = 'cotizador-opciones'
const ETIQUETA_CERRADO = 'Abrir cotizador'
const ETIQUETA_ABIERTO = 'Cerrar selector de cotizadores'

/**
 * FAB expandible ("speed-dial") que ofrece los cotizadores externos.
 *
 * Cada cotizador es un sistema aparte, con sesión propia: se abre en otra
 * pestaña con `noopener,noreferrer` para que no herede ninguna referencia a
 * esta ventana. Quién lo ve y dónde aparece se decide en `ROLES_COTIZADOR` y
 * `enRutaCotizable`; ambas son decisiones de UX, no de seguridad.
 *
 * Las opciones se montan y desmontan en lugar de ocultarse con CSS: mantener
 * botones invisibles en el DOM los dejaría enfocables con Tab y anunciables
 * por lector de pantalla. La entrada se anima con la clase
 * `.speed-dial-opcion` de `src/index.css`.
 */
export function CotizadorFab() {
  const empleado = useAuthStore((s) => s.empleado)
  const { pathname } = useLocation()
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)

  const cerrar = useCallback((devolverFoco: boolean) => {
    setAbierto(false)
    // Solo al cerrar con teclado: tras un click fuera, robar el foco de vuelta
    // sacaría al usuario del elemento que acaba de pulsar.
    if (devolverFoco) fabRef.current?.focus()
  }, [])

  // Los listeners se suscriben solo mientras el panel está abierto: dejarlos
  // permanentes en `document` los haría correr en cada interacción de la app.
  useEffect(() => {
    if (!abierto) return

    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') cerrar(true)
    }
    const alApuntarFuera = (evento: PointerEvent) => {
      if (!contenedorRef.current?.contains(evento.target as Node)) cerrar(false)
    }

    document.addEventListener('keydown', alPulsarTecla)
    document.addEventListener('pointerdown', alApuntarFuera)
    return () => {
      document.removeEventListener('keydown', alPulsarTecla)
      document.removeEventListener('pointerdown', alApuntarFuera)
    }
  }, [abierto, cerrar])

  // El early return va DESPUÉS de los hooks: adelantarlo cambiaría el número
  // de hooks entre renders y React lanzaría.
  if (!tieneRol(empleado, ROLES_COTIZADOR) || !enRutaCotizable(pathname)) return null

  const abrirCotizador = (cotizador: Cotizador) => {
    window.open(cotizador.url, '_blank', 'noopener,noreferrer')
    cerrar(false)
  }

  return (
    <div
      ref={contenedorRef}
      className="absolute bottom-[88px] md:bottom-6 right-6 z-40 flex flex-col items-end gap-3"
    >
      {abierto && (
        <div id={ID_PANEL} className="flex flex-col items-end gap-3">
          {COTIZADORES.map((cotizador, indice) => (
            <button
              key={cotizador.id}
              type="button"
              onClick={() => abrirCotizador(cotizador)}
              // La opción más cercana al FAB entra primero: el escalonado sigue
              // al dedo, que viene desde abajo.
              style={{ animationDelay: `${(COTIZADORES.length - 1 - indice) * 40}ms` }}
              className="speed-dial-opcion flex items-center gap-3 rounded-pill border border-outline-variant/30 bg-white py-3 pl-4 pr-5 text-sm font-bold text-on-surface shadow-lg transition-colors hover:bg-surface-container"
            >
              <span className="material-symbols-outlined shrink-0 text-xl text-brand-primary" aria-hidden>
                {cotizador.icono}
              </span>
              <span className="whitespace-nowrap">{cotizador.nombre}</span>
            </button>
          ))}
        </div>
      )}

      <button
        ref={fabRef}
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        aria-expanded={abierto}
        aria-controls={ID_PANEL}
        aria-label={abierto ? ETIQUETA_ABIERTO : ETIQUETA_CERRADO}
        title={abierto ? ETIQUETA_ABIERTO : ETIQUETA_CERRADO}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-xl transition-shadow hover:shadow-2xl"
      >
        <span
          className={`material-symbols-outlined text-2xl transition-transform duration-200 ${abierto ? 'rotate-90' : ''}`}
          aria-hidden
        >
          {abierto ? 'close' : 'request_quote'}
        </span>
      </button>
    </div>
  )
}
