import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderConProviders, screen, userEvent, waitFor } from '@/test/utilidades'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import { PanelComentarios } from './PanelComentarios'

const COMENTARIO = {
  id: 1,
  tipo: 'tarea',
  id_actividad: 42,
  texto: 'Se habló con el contacto.',
  created_at: '2026-09-05T09:30:00Z',
  created_by: 7,
  autor: { id: 7, nombres: 'Juan', apellidos: 'Pérez' },
}

describe('PanelComentarios', () => {
  it('carga y muestra los comentarios de la actividad', async () => {
    servidorMock.use(
      http.get(`${BASE_API}/actividades/tarea/42/comentarios`, () =>
        HttpResponse.json({ data: [COMENTARIO], meta: null, error: null }),
      ),
    )
    renderConProviders(<PanelComentarios tipo="tarea" id={42} />)
    expect(await screen.findByText(/Se habló con el contacto/)).toBeInTheDocument()
  })

  it('no pide nada mientras `activo` es false', () => {
    // Sin handler declarado: con `onUnhandledRequest: 'error'` cualquier
    // petición haría fallar el test, que es justo la aserción.
    renderConProviders(<PanelComentarios tipo="tarea" id={42} activo={false} />)
    expect(screen.queryByText(/Se habló/)).not.toBeInTheDocument()
  })

  it('tras comentar, el nuevo comentario aparece en la lista', async () => {
    // Sincronización 360 (CLAUDE.md regla 4): la mutación invalida y el GET
    // se rehace. El segundo GET ya devuelve los dos comentarios.
    let vecesGet = 0
    servidorMock.use(
      http.get(`${BASE_API}/actividades/tarea/42/comentarios`, () => {
        vecesGet += 1
        const datos = vecesGet === 1 ? [COMENTARIO] : [COMENTARIO, { ...COMENTARIO, id: 2, texto: 'Cotización enviada.' }]
        return HttpResponse.json({ data: datos, meta: null, error: null })
      }),
      http.post(`${BASE_API}/actividades/tarea/42/comentarios`, () =>
        HttpResponse.json({ data: { ...COMENTARIO, id: 2, texto: 'Cotización enviada.' }, meta: null, error: null }, { status: 201 }),
      ),
    )
    renderConProviders(<PanelComentarios tipo="tarea" id={42} />)
    await screen.findByText(/Se habló con el contacto/)

    await userEvent.type(screen.getByLabelText(/nuevo comentario/i), 'Cotización enviada.')
    await userEvent.click(screen.getByRole('button', { name: /comentar/i }))

    await waitFor(() => expect(screen.getByText(/Cotización enviada/)).toBeInTheDocument())
  })

  it('ante un 404 explica que la actividad no existe o no es visible', async () => {
    // informe §4: el 404 es ambiguo A PROPÓSITO. El mensaje debe cubrir los dos casos.
    servidorMock.use(
      http.get(`${BASE_API}/actividades/tarea/42/comentarios`, () =>
        HttpResponse.json(
          { data: null, meta: null, error: { code: 'NO_ENCONTRADO', message: 'No encontrado' } },
          { status: 404 },
        ),
      ),
    )
    renderConProviders(<PanelComentarios tipo="tarea" id={42} />)
    expect(await screen.findByText(/no existe o no tienes acceso/i)).toBeInTheDocument()
  })
})
