import { describe, expect, it } from 'vitest'
import { etiquetaModelos, unidadesTotales } from './oportunidades'
import type { OportunidadItem } from '@/types'

function item(sobrescribe: Partial<OportunidadItem> = {}): OportunidadItem {
  return {
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
    ...sobrescribe,
  }
}

describe('etiquetaModelos', () => {
  it('devuelve un guion con la lista vacía', () => {
    // Rama defensiva que existía sin cobertura (hallazgo B12, T7.1): items
    // vacío no debería pasar, pero si pasa, no debe reventar.
    expect(etiquetaModelos([])).toBe('—')
  })

  it('devuelve el código a secas con un solo ítem', () => {
    expect(etiquetaModelos([item()])).toBe('KinWin K12')
  })

  it('devuelve "K12 +2" con tres ítems, sin mostrar el resto de los códigos', () => {
    // Nunca items[0] a secas: mostraría un modelo como si fuera toda la
    // operación (D3). "+N" es la única señal honesta de que hay más.
    const items = [
      item({ id: 1, modelo: { id: 1, codigo: 'KinWin K12', precio_base: '92000.00' } }),
      item({ id: 2, modelo: { id: 2, codigo: 'KinWin K15', precio_base: '98000.00' } }),
      item({ id: 3, modelo: { id: 3, codigo: 'KinWin K9', precio_base: '80000.00' } }),
    ]
    expect(etiquetaModelos(items)).toBe('KinWin K12 +2')
  })
})

describe('unidadesTotales', () => {
  it('devuelve 0 con la lista vacía', () => {
    expect(unidadesTotales([])).toBe(0)
  })

  it('devuelve la cantidad de un solo ítem', () => {
    expect(unidadesTotales([item({ cantidad: 8 })])).toBe(8)
  })

  it('suma las cantidades de varios ítems, no toma solo la del primero', () => {
    const items = [item({ id: 1, cantidad: 8 }), item({ id: 2, cantidad: 2 })]
    expect(unidadesTotales(items)).toBe(10)
  })
})
