import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderConProviders, screen, userEvent, waitFor, within } from '@/test/utilidades'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import type { EventoHistorial } from '@/types/simulacion'
import { HistorialModal } from './HistorialModal'

/**
 * T6.1 (`plan-05-vistas-simulaciones-tareas.md`), encargo §5.5.
 *
 * Tres degradaciones que parecen bugs y no lo son:
 *  - diff vacío es legítimo y frecuente (primer evento, o escritura que no tocó
 *    parámetros de cálculo) — nunca se muestra como error;
 *  - `created_by: null` es un job automático — se muestra "Sistema", nunca
 *    "undefined";
 *  - el 404 de restaurar cubre CUATRO motivos que el backend no distingue a
 *    propósito — el mensaje al usuario es genérico y único (D30).
 */

function envelope(data: unknown) {
  return HttpResponse.json({ data, meta: null, error: null })
}

function evento(overrides: Partial<EventoHistorial> = {}): EventoHistorial {
  return {
    id_evento_log: 1,
    tipo_evento: 'editada',
    created_at: '2026-09-01T10:00:00Z',
    created_by: 5,
    diff: [{ campo: 'tea', valor_anterior: '12.00', valor_nuevo: '14.00' }],
    ...overrides,
  }
}

function handlerHistorial(eventos: EventoHistorial[]) {
  return http.get(`${BASE_API}/simulaciones/900/historial`, () => envelope(eventos))
}

describe('HistorialModal', () => {
  it('muestra "sin cambios de parámetros" cuando el diff está vacío', async () => {
    // §5.5: diff vacío pasa en el primer evento y en escrituras que no tocan
    // parámetros de cálculo — no es un bug.
    servidorMock.use(handlerHistorial([evento({ tipo_evento: 'creada', diff: [] })]))
    renderConProviders(<HistorialModal idSimulacion={900} open onClose={() => {}} />)

    expect(await screen.findByText(/sin cambios de parámetros/i)).toBeInTheDocument()
  })

  it('muestra "Sistema" cuando created_by es null', async () => {
    // §5.5: created_by null es un job automático — "Sistema", nunca "undefined".
    servidorMock.use(handlerHistorial([evento({ created_by: null })]))
    renderConProviders(<HistorialModal idSimulacion={900} open onClose={() => {}} />)

    expect(await screen.findByText('Sistema')).toBeInTheDocument()
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument()
  })

  it('da un mensaje genérico cuando restaurar responde 404', async () => {
    // El 404 cubre CUATRO motivos que el backend no distingue a propósito.
    servidorMock.use(
      handlerHistorial([evento({ id_evento_log: 42 })]),
      http.post(`${BASE_API}/simulaciones/900/restaurar`, () =>
        HttpResponse.json(
          { data: null, meta: null, error: { code: 'NO_ENCONTRADO', message: 'No existe' } },
          { status: 404 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderConProviders(<HistorialModal idSimulacion={900} open onClose={() => {}} />)

    const boton = await screen.findByRole('button', { name: /restaurar/i })
    await user.click(boton)

    expect(
      await screen.findByText(/esa versión ya no se puede restaurar/i),
    ).toBeInTheDocument()
  })

  it('lista los eventos en el orden que llegan del backend, sin reordenar', async () => {
    // El backend ya los ordena más recientes primero (§23) — el componente no
    // debe reordenar por su cuenta.
    servidorMock.use(
      handlerHistorial([
        evento({ id_evento_log: 2, tipo_evento: 'restaurada', created_at: '2026-09-05T00:00:00Z' }),
        evento({ id_evento_log: 1, tipo_evento: 'creada', created_at: '2026-09-01T00:00:00Z', diff: [] }),
      ]),
    )
    renderConProviders(<HistorialModal idSimulacion={900} open onClose={() => {}} />)

    const filas = await screen.findAllByTestId('historial-evento')
    expect(filas).toHaveLength(2)
    expect(within(filas[0] as HTMLElement).getByText(/restaurada/i)).toBeInTheDocument()
    expect(within(filas[1] as HTMLElement).getByText(/creada/i)).toBeInTheDocument()
  })

  it('muestra tipo_evento, fecha, autor y el diff como lista de campo/valor', async () => {
    servidorMock.use(
      handlerHistorial([
        evento({
          diff: [
            { campo: 'tea', valor_anterior: '12.00', valor_nuevo: '14.00' },
            { campo: 'plazo_meses', valor_anterior: '36', valor_nuevo: '48' },
          ],
        }),
      ]),
    )
    renderConProviders(<HistorialModal idSimulacion={900} open onClose={() => {}} />)

    const fila = await screen.findByTestId('historial-evento')
    expect(within(fila).getByText(/editada/i)).toBeInTheDocument()
    expect(within(fila).getByText('tea')).toBeInTheDocument()
    expect(within(fila).getByText(/12\.00/)).toBeInTheDocument()
    expect(within(fila).getByText(/14\.00/)).toBeInTheDocument()
  })

  it('muestra la nota de la ventana de 15 eventos / 7 días sin prometer más', async () => {
    servidorMock.use(handlerHistorial([evento()]))
    renderConProviders(<HistorialModal idSimulacion={900} open onClose={() => {}} />)

    expect(await screen.findByText(/15/)).toBeInTheDocument()
    expect(screen.getByText(/7 días/i)).toBeInTheDocument()
    // §8.3: nunca se promete que hay más versiones accesibles en otro lado.
    expect(screen.queryByText(/ver más|historial completo/i)).not.toBeInTheDocument()
  })

  it('restaura exitosamente y confía en la invalidación del hook, sin duplicarla', async () => {
    servidorMock.use(
      handlerHistorial([evento({ id_evento_log: 42 })]),
      http.post(`${BASE_API}/simulaciones/900/restaurar`, () =>
        envelope({ id: 900, id_oportunidad: 501 }),
      ),
    )
    const user = userEvent.setup()
    renderConProviders(<HistorialModal idSimulacion={900} open onClose={() => {}} />)

    const boton = await screen.findByRole('button', { name: /restaurar/i })
    await user.click(boton)

    await waitFor(() => expect(screen.getByText(/se restauró/i)).toBeInTheDocument())
  })
})
