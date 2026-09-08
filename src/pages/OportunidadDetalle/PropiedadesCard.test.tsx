import { describe, expect, it, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { crearQueryClientDePrueba, renderConProviders, screen, userEvent, waitFor } from '@/test/utilidades'
import { servidorMock, BASE_API } from '@/test/servidor-mock'
import { qk } from '@/hooks/queryKeys'
import { PropiedadesCard } from './PropiedadesCard'
import { useAuthStore } from '@/store/authStore'
import type { Financiadora, Modelo, OportunidadDetalle, OportunidadItem } from '@/types'

/**
 * La tarjeta monta el modal de antd completo (Form, Select, InputNumber) sobre
 * jsdom: cada interacción cuesta más de un segundo. Con el timeout por defecto
 * de Vitest (5 s) el test falla por lento, no por incorrecto.
 */
const TIMEOUT_INTERACTIVO = 20_000

const EMPLEADO = {
  id: 1,
  nombres: 'Ana',
  apellidos: 'Ruiz',
  email: 'ana@quantum.pe',
  rol: 'vendedor' as const,
  area: 'Ventas',
  puesto: 'Vendedor',
  activo: true,
}

const MODELO_K12: Modelo = {
  id: 1,
  codigo: 'KinWin K12',
  longitud: '12 m',
  capacidad_tanques: '5 x 80 L',
  max_asientos: 45,
  precio_base: '92000.00',
  ficha_tecnica: null,
  aplicaciones: ['urbano'],
}

const MODELO_K15: Modelo = {
  ...MODELO_K12,
  id: 2,
  codigo: 'KinWin K15',
  precio_base: '98000.00',
}

const FINANCIADORA: Financiadora = {
  id: 1,
  nombre: 'Calidda – Fraccionamiento GNV',
  monto_por_unidad: '45000.00',
  plazo_meses: 48,
  tea: '0.0000',
  cuota_por_unidad: '937.50',
  es_default: true,
  notas: null,
}

function item(sobrescribe: Partial<OportunidadItem> = {}): OportunidadItem {
  return {
    id: 501,
    id_modelo: 1,
    modelo: MODELO_K12,
    cantidad: 8,
    precio_venta: '92000.00',
    descuento: '0.00',
    cuota_financiadora: '937.50',
    cuota_quantum: null,
    cuota_total: null,
    monto_item: '736000.00',
    advertencias: [],
    ...sobrescribe,
  }
}

function oportunidad(items: OportunidadItem[] = [item()]): OportunidadDetalle {
  return {
    id: 101,
    id_empresa: 3,
    empresa: { id: 3, razon_social: 'Transp. Sta. Anita S.A.', distrito: 'Santa Anita' },
    id_vendedor: 1,
    vendedor: { id: 1, nombres: 'Ana', apellidos: 'Ruiz' },
    id_financiadora: 1,
    financiadora: FINANCIADORA,
    estado: 'documentos_legales',
    items,
    monto_total: '736000.00',
    cuota_quantum_total: null,
    cuota_total: null,
    cuota_diaria_total: null,
    garantia: true,
    finc_paralelo: false,
    ficha_venta: null,
    drive_folder_id: null,
    notas: null,
    motivo_cierre: null,
    fecha_cierre_estimado: '2026-07-10',
    tareas_pendientes_count: 0,
    eventos_pendientes_count: 0,
    created_at: '2026-05-15T09:00:00Z',
    contactos: [],
    entrada_etapa_actual: null,
  }
}

/** Catálogo de modelos: el componente lo pide siempre. Sin handler, MSW corta el test. */
function handlerDeModelos() {
  return http.get(`${BASE_API}/modelos`, () =>
    HttpResponse.json({ data: [MODELO_K12, MODELO_K15], meta: null, error: null }),
  )
}

describe('PropiedadesCard', () => {
  beforeEach(() => {
    useAuthStore.setState({ empleado: EMPLEADO, cargando: false })
  })

  it(
    'persiste el precio editado por el endpoint de ítems, no por el de la oportunidad',
    async () => {
      // Regresión de K5: `PUT /oportunidades/:id` acepta los términos y los DESCARTA
      // en silencio. El usuario veía "Guardado" y no se guardaba nada.
      const llamadas: string[] = []
      let cuerpoDelItem: Record<string, unknown> = {}

      servidorMock.use(
        handlerDeModelos(),
        http.put(`${BASE_API}/oportunidades/:id/items/:itemId`, async ({ request }) => {
          llamadas.push('item')
          cuerpoDelItem = (await request.json()) as Record<string, unknown>
          return HttpResponse.json({
            data: item({ precio_venta: '95000.00', monto_item: '760000.00' }),
            meta: null,
            error: null,
          })
        }),
        http.put(`${BASE_API}/oportunidades/:id`, () => {
          llamadas.push('oportunidad')
          return HttpResponse.json({ data: oportunidad(), meta: null, error: null })
        }),
      )

      // `delay: null` quita la espera entre teclas: el tecleo realista de
      // user-event sobre antd + jsdom solo añade segundos al test.
      const usuario = userEvent.setup({ delay: null })

      renderConProviders(<PropiedadesCard oportunidad={oportunidad()} />)

      await usuario.click(screen.getByRole('button', { name: /editar términos/i }))

      const precio = await screen.findByLabelText(/precio unitario/i)
      await usuario.clear(precio)
      await usuario.type(precio, '95000')

      await usuario.click(screen.getByRole('button', { name: /^guardar$/i }))

      await waitFor(() => expect(llamadas).toContain('item'))
      expect(cuerpoDelItem.precio_venta).toBe('95000.00')
      // Lo importante del bug: no se toca el endpoint que descarta en silencio.
      expect(llamadas).not.toContain('oportunidad')
    },
    TIMEOUT_INTERACTIVO,
  )

  it(
    'invalida Inicio, Prospección, Reportes y Tareas al editar un ítem, no solo la oportunidad',
    async () => {
      // Regresión B1 (auditoría T7.1): useActualizarItem invalidaba solo
      // oportunidad/oportunidades/empresas. Cambiar precio o cantidad de un
      // ítem cambia monto_total, que Inicio, Prospección, Reportes y Tareas
      // también muestran (contrato §28, changelog 2026-09-04: los reportes
      // leen oportunidad_items directamente). Sin esto, esas vistas quedaban
      // con el monto viejo hasta un remount — CLAUDE.md regla 4.
      servidorMock.use(
        handlerDeModelos(),
        http.put(`${BASE_API}/oportunidades/:id/items/:itemId`, () =>
          HttpResponse.json({ data: item({ precio_venta: '95000.00' }), meta: null, error: null }),
        ),
      )

      const queryClient = crearQueryClientDePrueba()
      const invalidadas: unknown[][] = []
      const invalidateQueriesOriginal = queryClient.invalidateQueries.bind(queryClient)
      queryClient.invalidateQueries = (filtro?: { queryKey?: readonly unknown[] }) => {
        if (filtro?.queryKey) invalidadas.push([...filtro.queryKey])
        return invalidateQueriesOriginal(filtro)
      }

      const usuario = userEvent.setup({ delay: null })

      renderConProviders(<PropiedadesCard oportunidad={oportunidad()} />, { queryClient })

      await usuario.click(screen.getByRole('button', { name: /editar términos/i }))
      const precio = await screen.findByLabelText(/precio unitario/i)
      await usuario.clear(precio)
      await usuario.type(precio, '95000')
      await usuario.click(screen.getByRole('button', { name: /^guardar$/i }))

      await waitFor(() => expect(invalidadas.length).toBeGreaterThan(0))

      const tocaPrefijo = (prefijo: readonly unknown[]) =>
        invalidadas.some((key) => prefijo.every((parte, i) => key[i] === parte))

      expect(tocaPrefijo(qk.inicio)).toBe(true)
      expect(tocaPrefijo(qk.prospeccion)).toBe(true)
      expect(tocaPrefijo(qk.reportes)).toBe(true)
      expect(tocaPrefijo(qk.tareas)).toBe(true)
      expect(tocaPrefijo(qk.oportunidad(101))).toBe(true)
    },
    TIMEOUT_INTERACTIVO,
  )

  it('muestra una fila por modelo vendido, no solo el primero', async () => {
    // Con varios ítems, enseñar uno solo presentaría un modelo como si fuera
    // toda la operación. El total de la raíz se sigue mostrando una sola vez.
    servidorMock.use(handlerDeModelos())

    renderConProviders(
      <PropiedadesCard
        oportunidad={oportunidad([
          item(),
          item({ id: 502, id_modelo: 2, modelo: MODELO_K15, cantidad: 2, precio_venta: '98000.00' }),
        ])}
      />,
    )

    expect(await screen.findByText('KinWin K12')).toBeInTheDocument()
    expect(screen.getByText('KinWin K15')).toBeInTheDocument()
    expect(screen.getByText('8 unidades')).toBeInTheDocument()
    expect(screen.getByText('2 unidades')).toBeInTheDocument()
  })

  it('no confunde la cuota por unidad del ítem con la cuota total de la operación', async () => {
    // Encargo §4.1: `cuota_total` existe en DOS niveles con significados distintos.
    // El ítem vale 2172.06 (una unidad); la raíz 17376.48 (toda la operación, ya
    // multiplicada por cantidades). Es el único sitio donde ambas se ven juntas.
    servidorMock.use(handlerDeModelos())

    renderConProviders(
      <PropiedadesCard
        oportunidad={{
          ...oportunidad([item({ cuota_quantum: '1234.56', cuota_total: '2172.06' })]),
          cuota_quantum_total: '9876.48',
          cuota_total: '17376.48',
          cuota_diaria_total: '789.84',
        }}
      />,
    )

    const porUnidad = await screen.findByRole('group', { name: /cuota mensual por unidad/i })
    const total = screen.getByRole('group', { name: /cuota mensual total/i })

    expect(porUnidad).toHaveTextContent('2,172.06')
    expect(total).toHaveTextContent('17,376.48')
    // Lo que el encargo prohíbe explícitamente: mezclarlas.
    expect(total).not.toHaveTextContent('2,172.06')
    expect(porUnidad).not.toHaveTextContent('17,376.48')

    expect(screen.getByRole('group', { name: /cuota quantum por unidad/i })).toHaveTextContent(
      '1,234.56',
    )
    expect(screen.getByRole('group', { name: /cuota diaria/i })).toHaveTextContent('789.84')
  })

  it('con las cuotas en null lo dice, sin ceros y sin ningún toast de error', async () => {
    // Encargo §4.1: los tres campos de raíz son `null` conjuntamente cuando algún
    // ítem no tiene cuota calculable, y un `cuota_quantum` de ítem en `null` es
    // "degradación silenciosa esperada, NUNCA un error".
    servidorMock.use(handlerDeModelos())

    // El fixture por defecto ya trae las cinco cuotas en `null`.
    renderConProviders(<PropiedadesCard oportunidad={oportunidad()} />)

    expect(await screen.findByText(/todavía no se puede calcular/i)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /cuota quantum por unidad/i })).toHaveTextContent(
      'Sin calcular',
    )
    expect(screen.queryByText(/\$\s*0[.,]00/)).not.toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('KinWin K12')).toBeInTheDocument())
    expect(document.querySelector('.ant-message')).toBeNull()
    expect(document.querySelector('.ant-notification')).toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
