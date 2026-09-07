import { describe, expect, it } from 'vitest'
import { calcularDescuento, calcularMontoItem, calcularMontoOportunidad } from './monto'

describe('calcularMontoItem', () => {
  it('multiplica cantidad por precio cuando no hay descuento', () => {
    expect(calcularMontoItem(3, '1000.00', '0')).toBe(3000)
  })

  it('aplica el descuento como porcentaje del bruto', () => {
    expect(calcularMontoItem(2, '1000.00', '10')).toBe(1800)
  })

  it('redondea a dos decimales', () => {
    expect(calcularMontoItem(3, '10.005', '0')).toBe(30.02)
  })

  it('devuelve 0 si algún valor no es numérico', () => {
    expect(calcularMontoItem(2, 'abc', '10')).toBe(0)
  })

  it('trata null y undefined como cero', () => {
    expect(calcularMontoItem(null, undefined, null)).toBe(0)
  })
})

describe('calcularDescuento', () => {
  it('devuelve el importe descontado, no el porcentaje', () => {
    expect(calcularDescuento(2, '1000.00', '10')).toBe(200)
  })

  it('devuelve 0 si no hay descuento', () => {
    expect(calcularDescuento(2, '1000.00', '0')).toBe(0)
  })

  it('el bruto menos el descuento es el monto total', () => {
    const bruto = 2 * 1000
    expect(bruto - calcularDescuento(2, '1000.00', '10')).toBe(
      calcularMontoItem(2, '1000.00', '10'),
    )
  })
})

describe('calcularMontoOportunidad', () => {
  it('suma el monto de cada ítem con descuento aplicado', () => {
    const items = [
      { cantidad: 8, precio_venta: '92000.00', descuento: '3.00' },
      { cantidad: 2, precio_venta: '50000.00', descuento: '0.00' },
    ]
    // 8 × 92000 × 0.97 = 713 920.00   +   2 × 50000 = 100 000.00
    expect(calcularMontoOportunidad(items)).toBe(813920)
  })

  it('redondea por ítem antes de sumar, igual que el backend', () => {
    // Si se redondeara solo al final, el total diferiría en céntimos de
    // `monto_total`, que el backend calcula sumando `monto_item` ya redondeados.
    const items = [
      { cantidad: 3, precio_venta: '333.33', descuento: '7.77' },
      { cantidad: 3, precio_venta: '333.33', descuento: '7.77' },
    ]
    const porItem = Math.round(3 * 333.33 * (1 - 7.77 / 100) * 100) / 100
    expect(calcularMontoOportunidad(items)).toBe(Math.round(porItem * 2 * 100) / 100)
  })

  it('devuelve 0 con la lista vacía', () => {
    expect(calcularMontoOportunidad([])).toBe(0)
  })
})
