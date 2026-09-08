import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Simulacion } from '@/types/simulacion'
import { TarjetaSimulacion } from './TarjetaSimulacion'

/**
 * T5.1 (`plan-05-vistas-simulaciones-tareas.md`), encargo §5.1 / reglas §8.2.
 *
 * `TarjetaSimulacion` es un componente tonto: recibe la simulación ya resuelta
 * y no pide datos por su cuenta (mismo patrón que `CronogramaTabla`, D23). Los
 * tests fijan las reglas explícitas del encargo:
 *  - §7.4/D29: la huérfana muestra su fecha de eliminación prevista, VISIBLE
 *    en la UI, no solo lógica de servidor;
 *  - §8.3: la UI nunca promete "te vamos a avisar" — la garantía real es
 *    `eliminacion_prevista_el`;
 *  - §7.5/K33: sin ítem no se ofrece el botón de marcar principal;
 *  - §8.1: el nombre autogenerado se distingue visualmente del manual.
 */

function envolver(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

function simulacion(overrides: Partial<Simulacion> = {}): Simulacion {
  return {
    id: 900,
    nombre: 'Transportes Lima SAC · KW-12 · Leasing · #2',
    nombre_es_manual: false,
    modo: 'leasing',
    id_oportunidad_item: 77,
    id_oportunidad: 501,
    id_modelo: 3,
    modelo: { id: 3, codigo: 'KW-12' },
    id_simulacion_origen: null,
    precio_venta: '150000.00',
    descuento: '5.00',
    cuota_inicial: '45000.00',
    plazo_meses: 48,
    tea: '14.00',
    valor_residual: '15000.00',
    dias_trabajados: 22,
    comision_estructuracion: '0.00',
    cuota_final: '2172.06',
    es_principal: false,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-02T00:00:00Z',
    eliminacion_prevista_el: null,
    ...overrides,
  }
}

describe('TarjetaSimulacion', () => {
  it('muestra los campos exactos de la tarjeta en el orden de reglas §8.2', () => {
    envolver(<TarjetaSimulacion simulacion={simulacion()} />)

    expect(screen.getByText('Transportes Lima SAC · KW-12 · Leasing · #2')).toBeInTheDocument()
    expect(screen.getByText('USD 2,172.06')).toBeInTheDocument() // cuota_final destacada
    expect(screen.getByText('14.00%')).toBeInTheDocument() // tea
    expect(screen.getByText('USD 15,000.00')).toBeInTheDocument() // valor_residual
    expect(screen.getByText('USD 45,000.00')).toBeInTheDocument() // cuota_inicial
    expect(screen.getByText(/01 ago 2026/i)).toBeInTheDocument() // pie: updated_at
  })

  it('muestra el badge de principal cuando es_principal es true', () => {
    envolver(<TarjetaSimulacion simulacion={simulacion({ es_principal: true })} />)
    expect(screen.getByText(/principal/i)).toBeInTheDocument()
  })

  it('muestra la fecha de eliminación prevista en una simulación huérfana', () => {
    // §7.4: "La regla debe ser visible en la UI, no solo lógica de servidor."
    envolver(
      <TarjetaSimulacion
        simulacion={simulacion({
          id_oportunidad_item: null,
          id_oportunidad: null,
          eliminacion_prevista_el: '2026-10-01T12:00:00Z',
        })}
      />,
    )
    expect(screen.getByText(/se eliminará el/i)).toBeInTheDocument()
    expect(screen.getByText(/01 oct 2026/i)).toBeInTheDocument()
  })

  it('no promete que se va a avisar antes de eliminar', () => {
    // §8.3: la garantía real es `eliminacion_prevista_el`, nunca una promesa de aviso.
    envolver(
      <TarjetaSimulacion
        simulacion={simulacion({
          id_oportunidad_item: null,
          id_oportunidad: null,
          eliminacion_prevista_el: '2026-10-01T00:00:00Z',
        })}
      />,
    )
    expect(screen.queryByText(/te avisaremos/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/siempre.*avis/i)).not.toBeInTheDocument()
  })

  it('no ofrece marcar como principal en una huérfana', () => {
    // §7.5/K33: sin ítem, es_principal es siempre false — no se ofrece el botón.
    envolver(
      <TarjetaSimulacion
        simulacion={simulacion({ id_oportunidad_item: null, id_oportunidad: null })}
        onMarcarPrincipal={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /principal/i })).not.toBeInTheDocument()
  })

  it('ofrece marcar como principal en una simulación enlazada a un ítem', () => {
    envolver(
      <TarjetaSimulacion simulacion={simulacion({ es_principal: false })} onMarcarPrincipal={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /marcar como principal/i })).toBeInTheDocument()
  })

  it('marcar como principal ya siendo principal es un no-op exitoso: no muestra error ni deshabilita', async () => {
    // K33: "Marcar como principal una que ya lo es es un no-op exitoso, no un error."
    const onMarcarPrincipal = vi.fn()
    const user = userEvent.setup()
    envolver(
      <TarjetaSimulacion
        simulacion={simulacion({ es_principal: true })}
        onMarcarPrincipal={onMarcarPrincipal}
      />,
    )
    const boton = screen.getByRole('button', { name: /marcar como principal/i })
    expect(boton).not.toBeDisabled()
    await user.click(boton)
    expect(onMarcarPrincipal).toHaveBeenCalledWith(900)
  })

  it('muestra el nombre autogenerado como tal cuando nombre_es_manual es false', () => {
    // §8.1: el nombre autogenerado se distingue del manual, sin parsearlo ni
    // esconder la diferencia — es información legítima para el usuario.
    envolver(<TarjetaSimulacion simulacion={simulacion({ nombre_es_manual: false })} />)
    expect(screen.getByText(/autogenerado/i)).toBeInTheDocument()
  })

  it('no marca el nombre como autogenerado cuando nombre_es_manual es true', () => {
    envolver(
      <TarjetaSimulacion
        simulacion={simulacion({ nombre_es_manual: true, nombre: 'Cotización especial Q3' })}
      />,
    )
    expect(screen.getByText('Cotización especial Q3')).toBeInTheDocument()
    expect(screen.queryByText(/autogenerado/i)).not.toBeInTheDocument()
  })
})
