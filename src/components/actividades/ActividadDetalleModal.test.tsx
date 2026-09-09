import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderConProviders, screen, userEvent } from '@/test/utilidades'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import type { Actividad } from '@/types'
import { ActividadDetalleModal } from './ActividadDetalleModal'

function evento(): Actividad {
  return {
    tipo: 'evento',
    id: 15,
    titulo: 'Visita a planta',
    descripcion: null,
    estado: 'pendiente',
    fecha_hora: null,
    fecha_dia: '2026-09-15',
    id_empresa: null,
    empresa: null,
    id_oportunidad: 20,
    id_empleado: 7,
    empleado: { id: 7, nombres: 'Juan', apellidos: 'Pérez' },
    comentarios: 0,
    created_at: '2026-09-02T14:30:00Z',
  }
}

function handlersVacios(tipo: string, id: number) {
  return [
    http.get(`${BASE_API}/actividades/${tipo}/${id}/comentarios`, () =>
      HttpResponse.json({ data: [], meta: null, error: null }),
    ),
    http.get(`${BASE_API}/actividades/${tipo}/${id}/auditoria`, () =>
      HttpResponse.json({ data: [], meta: null, error: null }),
    ),
  ]
}

describe('ActividadDetalleModal', () => {
  it('no renderiza nada abierto cuando la actividad es null', () => {
    renderConProviders(<ActividadDetalleModal actividad={null} onClose={() => {}} />)
    expect(screen.queryByText(/Visita a planta/)).not.toBeInTheDocument()
  })

  it('muestra la fecha de un evento sin desplazar el día', async () => {
    // informe §13.2: `fecha_dia` es una fecha calendario. `new Date()` la
    // retrocedería al 14 en Lima.
    servidorMock.use(...handlersVacios('evento', 15))
    renderConProviders(<ActividadDetalleModal actividad={evento()} onClose={() => {}} />)
    expect(await screen.findByText(/15 sep 2026/)).toBeInTheDocument()
  })

  it('la pestaña de cambios pide la auditoría solo al abrirla', async () => {
    servidorMock.use(...handlersVacios('evento', 15))
    renderConProviders(<ActividadDetalleModal actividad={evento()} onClose={() => {}} />)

    await userEvent.click(screen.getByRole('tab', { name: /cambios/i }))
    expect(await screen.findByText(/sin ediciones/i)).toBeInTheDocument()
  })
})
