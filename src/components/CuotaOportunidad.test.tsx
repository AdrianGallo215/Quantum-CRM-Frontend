import { describe, expect, it } from 'vitest'
import { renderConProviders, screen } from '@/test/utilidades'
import { CuotaOportunidad } from './CuotaOportunidad'
import type { Oportunidad, OportunidadItem } from '@/types'

/**
 * Los cuatro casos que capturan las reglas del encargo §4.1:
 *   a) los tres campos de raíz en `null` → "todavía no se puede calcular",
 *      jamás cero ni un guion suelto que parezca un monto;
 *   b) un `cuota_quantum` de ítem en `null` no dispara ningún toast;
 *   c) el `cuota_total` del ÍTEM y el de la RAÍZ no se confunden (D13);
 *   d) la cuota diaria se muestra.
 */

const ITEM_BASE: OportunidadItem = {
  id: 501,
  id_modelo: 1,
  modelo: { id: 1, codigo: 'KinWin K12', precio_base: '92000.00' },
  cantidad: 8,
  precio_venta: '92000.00',
  descuento: '0.00',
  cuota_financiadora: '937.50',
  cuota_quantum: null,
  cuota_total: null,
  monto_item: '736000.00',
  advertencias: [],
}

function oportunidad(sobrescribe: Partial<Oportunidad> = {}): Oportunidad {
  return {
    id: 101,
    id_empresa: 3,
    empresa: { id: 3, razon_social: 'Transp. Sta. Anita S.A.', distrito: 'Santa Anita' },
    id_vendedor: 1,
    vendedor: { id: 1, nombres: 'Ana', apellidos: 'Ruiz' },
    id_financiadora: null,
    financiadora: null,
    estado: 'documentos_legales',
    items: [ITEM_BASE],
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
    fecha_cierre_estimado: null,
    tareas_pendientes_count: 0,
    eventos_pendientes_count: 0,
    created_at: '2026-05-15T09:00:00Z',
    ...sobrescribe,
  }
}

/** Sin cuotas: algún ítem no tiene `cuota_quantum`, así que los TRES son `null`. */
const SIN_CUOTAS = oportunidad()

/**
 * Con cuotas. El ítem vale 2172.06 (UNA unidad: 1234.56 + 937.50); la raíz
 * 17376.48 (2172.06 × 8, toda la operación). Son los dos `cuota_total`.
 */
const CON_CUOTAS = oportunidad({
  items: [{ ...ITEM_BASE, cuota_quantum: '1234.56', cuota_total: '2172.06' }],
  cuota_quantum_total: '9876.48',
  cuota_total: '17376.48',
  cuota_diaria_total: '789.84',
})

describe('CuotaOportunidad', () => {
  it('muestra "todavía no se puede calcular" cuando los tres campos son null', () => {
    // Encargo §4.1: los tres son null CONJUNTAMENTE si cualquier ítem no tiene
    // cuota calculable. Jamás como cero.
    renderConProviders(<CuotaOportunidad oportunidad={SIN_CUOTAS} />)

    expect(screen.getByText(/todavía no se puede calcular/i)).toBeInTheDocument()
    expect(screen.queryByText('0.00')).not.toBeInTheDocument()
    expect(screen.queryByText(/\$\s*0[.,]00/)).not.toBeInTheDocument()
    // "jamás ... como guion suelto que parezca un monto"
    expect(screen.queryByText('—')).not.toBeInTheDocument()
    expect(screen.queryByText('-')).not.toBeInTheDocument()
  })

  it('no dispara un toast de error cuando un ítem tiene cuota_quantum null', () => {
    // Encargo §4.1: "degradación silenciosa esperada, NUNCA un error".
    const { container } = renderConProviders(<CuotaOportunidad oportunidad={SIN_CUOTAS} />)

    expect(document.querySelector('.ant-message')).toBeNull()
    expect(document.querySelector('.ant-notification')).toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(container.querySelector('.ant-alert-error')).toBeNull()
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/no se pudo/i)).not.toBeInTheDocument()
  })

  it('distingue la cuota por unidad del ítem de la cuota total de la operación', () => {
    // Encargo §4.1: `cuota_total` existe en DOS niveles con significados distintos.
    // El ítem vale 2172.06 (una unidad); la raíz 17376.48 (toda la operación).
    renderConProviders(<CuotaOportunidad oportunidad={CON_CUOTAS} />)

    const total = screen.getByRole('group', { name: /cuota mensual total/i })
    expect(total).toHaveTextContent('17,376.48')
    expect(total).not.toHaveTextContent('2,172.06')

    // La etiqueta de la raíz dice "total", no "por unidad": son rótulos distintos (D13).
    expect(screen.queryByText(/por unidad/i)).not.toBeInTheDocument()
    // Y el valor de una unidad no aparece por ningún lado de este bloque.
    expect(screen.queryByText(/2,172\.06/)).not.toBeInTheDocument()
  })

  it('muestra la cuota diaria', () => {
    renderConProviders(<CuotaOportunidad oportunidad={CON_CUOTAS} />)

    const diaria = screen.getByRole('group', { name: /cuota diaria/i })
    expect(diaria).toHaveTextContent('789.84')
  })

  it('muestra la cuota Quantum total, sin confundirla con la cuota mensual total', () => {
    renderConProviders(<CuotaOportunidad oportunidad={CON_CUOTAS} />)

    const quantum = screen.getByRole('group', { name: /cuota quantum total/i })
    expect(quantum).toHaveTextContent('9,876.48')
    expect(quantum).not.toHaveTextContent('17,376.48')
  })
})
