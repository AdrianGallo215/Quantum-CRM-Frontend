import { describe, expect, it } from 'vitest'
import {
  DEFAULTS_SIMULACION,
  formatoCuota,
  formatoTasa,
  formatoTea,
  validarCuotaInicial,
  validarValorResidual,
} from './simulaciones'

describe('formatoCuota', () => {
  it('nunca muestra null como cero', () => {
    expect(formatoCuota(null)).not.toContain('0')
  })

  it('nunca muestra null como un guion suelto que parezca un monto', () => {
    // Encargo §4.1: "jamás como cero ni como guion suelto que parezca un monto"
    expect(formatoCuota(null)).not.toBe('—')
    expect(formatoCuota(null)).not.toBe('-')
  })

  it('formatea un monto normal', () => {
    expect(formatoCuota('1234.56')).toContain('1,234.56')
  })
})

describe('formatoTea', () => {
  it('trata la escala 1-100, no la fraccionaria de financiadoras', () => {
    // Encargo §7.6: acá 14.00 = 14%. En `financiadoras` la misma clave es fraccionaria.
    expect(formatoTea('14.00')).toBe('14.00%')
  })

  it('devuelve un guion si el valor no es numérico', () => {
    expect(formatoTea('abc')).toBe('—')
  })
})

describe('formatoTasa', () => {
  it('no redondea la TNM a 2 decimales', () => {
    // reglas §3.1: "La Tasa Nominal Mensual no se redondea nunca"
    expect(formatoTasa('1.0948912345')).toBe('1.094891%')
  })

  it('devuelve un guion si el valor no es numérico', () => {
    expect(formatoTasa('abc')).toBe('—')
  })
})

describe('DEFAULTS_SIMULACION', () => {
  it('trae los valores del encargo §7.7', () => {
    expect(DEFAULTS_SIMULACION).toEqual({
      plazo_meses: 48,
      tea: '14',
      cuota_inicial: '45000',
      valor_residual: '25000',
      dias_trabajados: 22,
      comision_estructuracion: '1180',
    })
  })
})

describe('validarCuotaInicial', () => {
  it('rechaza una cuota inicial igual o mayor al precio con descuento', () => {
    expect(validarCuotaInicial(10000, 10000, 0)).not.toBeNull()
  })

  it('acepta una cuota inicial menor al precio con descuento', () => {
    expect(validarCuotaInicial(5000, 10000, 0)).toBeNull()
  })

  it('aplica el descuento antes de comparar', () => {
    // precio 10000 con 50% de descuento -> pv efectivo 5000
    expect(validarCuotaInicial(4000, 10000, 50)).toBeNull()
    expect(validarCuotaInicial(6000, 10000, 50)).not.toBeNull()
  })
})

describe('validarValorResidual', () => {
  it('rechaza un valor residual igual o mayor al principal', () => {
    expect(validarValorResidual(10000, 10000)).not.toBeNull()
  })

  it('acepta un valor residual menor al principal', () => {
    expect(validarValorResidual(5000, 10000)).toBeNull()
  })
})
