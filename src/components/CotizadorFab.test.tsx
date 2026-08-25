import { describe, expect, it, afterEach, vi } from 'vitest'
import { renderConProviders, screen, userEvent } from '@/test/utilidades'
import { CotizadorFab } from './CotizadorFab'
import { useAuthStore } from '@/store/authStore'
import { COTIZADORES, buscarCotizador } from '@/utils/cotizadores'
import type { Empleado, Rol } from '@/types'

function empleadoCon(rol: Rol): Empleado {
  return {
    id: 1,
    nombres: 'Ana',
    apellidos: 'Ruiz',
    email: 'ana@quantum.pe',
    rol,
    area: 'Ventas',
    puesto: 'Vendedor',
    activo: true,
  }
}

/**
 * Monta el FAB junto a un botón ajeno, para poder probar el cierre al pulsar
 * fuera sin depender de hacer click sobre `document.body`.
 */
function montar(rol: Rol, rutaInicial: string) {
  useAuthStore.setState({ empleado: empleadoCon(rol), cargando: false })
  return renderConProviders(
    <>
      <button type="button">Botón ajeno</button>
      <CotizadorFab />
    </>,
    { rutaInicial },
  )
}

const NOMBRE_FAB_CERRADO = 'Abrir cotizador'
const NOMBRE_FAB_ABIERTO = 'Cerrar selector de cotizadores'

/**
 * jsdom no implementa `window.open`: sin este espía cada click imprime un
 * "Not implemented" y no hay forma de verificar con qué se llamó. Se instala
 * dentro de cada test que lo necesita, y no en un `beforeEach`, para que
 * TypeScript infiera su tipo sin anotaciones que dependan de la versión de
 * Vitest.
 */
function espiarWindowOpen() {
  return vi.spyOn(window, 'open').mockReturnValue(null)
}

describe('CotizadorFab', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useAuthStore.setState({ empleado: null, cargando: false })
  })

  describe('quién lo ve', () => {
    it('lo ve el administrador (requisito del 2026-08-24)', () => {
      montar('admin', '/pipeline')

      expect(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO })).toBeInTheDocument()
    })

    it('lo ven vendedor, jdv y gerencia', () => {
      for (const rol of ['vendedor', 'jdv', 'gerencia'] as const) {
        const { unmount } = montar(rol, '/pipeline')
        expect(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO })).toBeInTheDocument()
        unmount()
      }
    })

    it('no lo ven los roles de apoyo', () => {
      for (const rol of ['analista', 'otro'] as const) {
        const { unmount } = montar(rol, '/pipeline')
        expect(screen.queryByRole('button', { name: NOMBRE_FAB_CERRADO })).not.toBeInTheDocument()
        unmount()
      }
    })

    it('no aparece si no hay sesión', () => {
      useAuthStore.setState({ empleado: null, cargando: false })
      renderConProviders(<CotizadorFab />, { rutaInicial: '/pipeline' })

      expect(screen.queryByRole('button', { name: NOMBRE_FAB_CERRADO })).not.toBeInTheDocument()
    })
  })

  describe('dónde aparece', () => {
    it('aparece en el detalle de una oportunidad', () => {
      montar('vendedor', '/oportunidades/42')

      expect(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO })).toBeInTheDocument()
    })

    it('no aparece fuera de las rutas cotizables, aunque el rol sea válido', () => {
      montar('admin', '/cartera')

      expect(screen.queryByRole('button', { name: NOMBRE_FAB_CERRADO })).not.toBeInTheDocument()
    })
  })

  describe('selección de cotizador', () => {
    it('arranca cerrado: ninguna opción está en el DOM ni anunciada', () => {
      montar('vendedor', '/pipeline')

      expect(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
      expect(screen.queryByRole('button', { name: 'Quantum Investment' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Quantum Leasing' })).not.toBeInTheDocument()
    })

    it('al pulsar el FAB despliega los dos cotizadores', async () => {
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))

      expect(screen.getByRole('button', { name: 'Quantum Investment' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Quantum Leasing' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: NOMBRE_FAB_ABIERTO })).toHaveAttribute(
        'aria-expanded',
        'true',
      )
    })

    it('abre Quantum Investment en otra pestaña, sin acceso a esta ventana', async () => {
      const abrirVentana = espiarWindowOpen()
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))
      await userEvent.click(screen.getByRole('button', { name: 'Quantum Investment' }))

      expect(abrirVentana).toHaveBeenCalledWith(
        buscarCotizador(COTIZADORES, 'investment').url,
        '_blank',
        'noopener,noreferrer',
      )
    })

    it('abre Quantum Leasing en otra pestaña, sin acceso a esta ventana', async () => {
      const abrirVentana = espiarWindowOpen()
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))
      await userEvent.click(screen.getByRole('button', { name: 'Quantum Leasing' }))

      expect(abrirVentana).toHaveBeenCalledWith(
        buscarCotizador(COTIZADORES, 'leasing').url,
        '_blank',
        'noopener,noreferrer',
      )
    })

    it('se cierra tras elegir un cotizador', async () => {
      // Sin asignar: este test no verifica la llamada, solo silencia el
      // "Not implemented" de jsdom. Asignarlo rompería `noUnusedLocals`.
      espiarWindowOpen()
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))
      await userEvent.click(screen.getByRole('button', { name: 'Quantum Leasing' }))

      expect(screen.queryByRole('button', { name: 'Quantum Leasing' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO })).toBeInTheDocument()
    })

    it('el segundo click en el FAB vuelve a cerrarlo', async () => {
      const abrirVentana = espiarWindowOpen()
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))
      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_ABIERTO }))

      expect(screen.queryByRole('button', { name: 'Quantum Investment' })).not.toBeInTheDocument()
      expect(abrirVentana).not.toHaveBeenCalled()
    })
  })

  describe('cierre por teclado y por click fuera', () => {
    it('las opciones son alcanzables con Tab mientras el panel está abierto', async () => {
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))
      // El FAB es el último del orden del DOM; shift+Tab retrocede a la
      // opción de abajo, la más cercana a él.
      await userEvent.tab({ shift: true })

      expect(screen.getByRole('button', { name: 'Quantum Leasing' })).toHaveFocus()
    })

    it('Escape cierra y devuelve el foco al FAB', async () => {
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))
      // Se mueve el foco fuera del FAB a propósito: si Escape se pulsara con
      // el foco todavía en él, la aserción final pasaría sin probar nada.
      await userEvent.tab({ shift: true })
      expect(screen.getByRole('button', { name: 'Quantum Leasing' })).toHaveFocus()

      await userEvent.keyboard('{Escape}')

      expect(screen.queryByRole('button', { name: 'Quantum Investment' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO })).toHaveFocus()
    })

    it('pulsar fuera cierra el panel sin abrir ningún cotizador', async () => {
      const abrirVentana = espiarWindowOpen()
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))
      await userEvent.click(screen.getByRole('button', { name: 'Botón ajeno' }))

      expect(screen.queryByRole('button', { name: 'Quantum Investment' })).not.toBeInTheDocument()
      expect(abrirVentana).not.toHaveBeenCalled()
    })
  })
})
