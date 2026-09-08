import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderConProviders, screen, waitFor } from '@/test/utilidades'
import { servidorMock, BASE_API } from '@/test/servidor-mock'
import { IndicadorTipoCambio } from './IndicadorTipoCambio'

function mockearTipoCambio(data: { fecha: string; compra: number; venta: number } | null) {
  servidorMock.use(
    http.get(`${BASE_API}/tipo-cambio`, () => HttpResponse.json({ data, meta: null, error: null })),
  )
}

describe('IndicadorTipoCambio', () => {
  it('no renderiza nada cuando el backend responde data: null con 200', async () => {
    // §22: es una respuesta VÁLIDA y esperada mientras el job diario no haya
    // poblado la primera fila. No es un 404 ni un error: simplemente no hay
    // indicador todavía.
    mockearTipoCambio(null)
    const { container } = renderConProviders(<IndicadorTipoCambio />)

    // `renderConProviders` envuelve todo en el `<AntApp>` de Ant Design, que
    // siempre monta su propio contenedor — por eso no se puede pedir
    // `toBeEmptyDOMElement()` sobre `container` a secas, se pediría que ni
    // siquiera ese wrapper exista. Lo que importa es que el componente en sí
    // no deje rastro: ni texto ni el icono del indicador.
    await waitFor(() => expect(container.textContent).toBe(''))
    expect(container.querySelector('.material-symbols-outlined')).not.toBeInTheDocument()
  })

  it('no muestra un error cuando no hay dato', async () => {
    mockearTipoCambio(null)
    renderConProviders(<IndicadorTipoCambio />)

    await waitFor(() => expect(screen.queryByText(/error/i)).not.toBeInTheDocument())
  })

  it('muestra compra y venta cuando hay dato', async () => {
    mockearTipoCambio({ fecha: '2026-09-07', compra: 3.751, venta: 3.758 })
    renderConProviders(<IndicadorTipoCambio />)

    expect(await screen.findByText(/3\.751/)).toBeInTheDocument()
    expect(screen.getByText(/3\.758/)).toBeInTheDocument()
  })
})
