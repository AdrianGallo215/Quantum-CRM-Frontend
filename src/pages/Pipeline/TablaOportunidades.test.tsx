import { describe, expect, it, beforeEach } from 'vitest'
import { renderConProviders, screen } from '@/test/utilidades'
import { TablaOportunidades } from './TablaOportunidades'
import { useAuthStore } from '@/store/authStore'
import type { Modelo, Oportunidad, OportunidadItem } from '@/types'

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

const MODELO_K18: Modelo = {
  ...MODELO_K12,
  id: 3,
  codigo: 'KinWin K18',
  precio_base: '110000.00',
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

function oportunidad(sobrescribe: Partial<Oportunidad> = {}): Oportunidad {
  return {
    id: 101,
    id_empresa: 3,
    empresa: { id: 3, razon_social: 'Transp. Sta. Anita S.A.', distrito: 'Santa Anita' },
    id_vendedor: 1,
    vendedor: { id: 1, nombres: 'Ana', apellidos: 'Ruiz' },
    id_financiadora: 1,
    financiadora: null,
    estado: 'documentos_legales',
    items: [item()],
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
    ...sobrescribe,
  }
}

describe('TablaOportunidades', () => {
  beforeEach(() => {
    useAuthStore.setState({
      empleado: {
        id: 1,
        nombres: 'Ana',
        apellidos: 'Ruiz',
        email: 'ana@quantum.pe',
        rol: 'vendedor',
        area: 'Ventas',
        puesto: 'Vendedor',
        activo: true,
      },
      cargando: false,
    })
  })

  it('muestra el código del modelo cuando la oportunidad tiene un solo ítem', () => {
    renderConProviders(<TablaOportunidades oportunidades={[oportunidad()]} />)

    expect(screen.getByText('KinWin K12')).toBeInTheDocument()
  })

  it('muestra "KinWin K12 +2" cuando la oportunidad tiene tres ítems', () => {
    // Nunca items[0] a secas: mostraría un modelo como si fuera toda la operación.
    const conTresItems = oportunidad({
      items: [
        item(),
        item({ id: 502, id_modelo: 2, modelo: MODELO_K15, cantidad: 2, precio_venta: '98000.00' }),
        item({ id: 503, id_modelo: 3, modelo: MODELO_K18, cantidad: 1, precio_venta: '110000.00' }),
      ],
    })

    renderConProviders(<TablaOportunidades oportunidades={[conTresItems]} />)

    expect(screen.getByText('KinWin K12 +2')).toBeInTheDocument()
  })
})
