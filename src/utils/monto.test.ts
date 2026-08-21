import { describe, expect, it } from 'vitest'
import { calcularDescuento, calcularMontoTotal } from './monto'

describe('calcularMontoTotal', () => {
  it('multiplica cantidad por precio cuando no hay descuento', () => {
    expect(calcularMontoTotal(3, '1000.00', '0')).toBe(3000)
  })

  it('aplica el descuento como porcentaje del bruto', () => {
    expect(calcularMontoTotal(2, '1000.00', '10')).toBe(1800)
  })

  it('redondea a dos decimales', () => {
    expect(calcularMontoTotal(3, '10.005', '0')).toBe(30.02)
  })

  it('devuelve 0 si algún valor no es numérico', () => {
    expect(calcularMontoTotal(2, 'abc', '10')).toBe(0)
  })

  it('trata null y undefined como cero', () => {
    expect(calcularMontoTotal(null, undefined, null)).toBe(0)
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
      calcularMontoTotal(2, '1000.00', '10'),
    )
  })
})
