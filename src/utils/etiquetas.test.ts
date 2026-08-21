import { describe, expect, it } from 'vitest'
import { ETIQUETA_ROL, ETIQUETA_TIPO_ACCION } from './etiquetas'

/**
 * Estos tests fijan los enums contra la tabla §23 de docs/contrato_api.md,
 * verificada contra el schema real de producción. Si el backend cambia un
 * enum, estos tests deben fallar ANTES de que un usuario vea un 400.
 */
describe('ETIQUETA_TIPO_ACCION', () => {
  it('cubre exactamente los valores de tipo_accion_enum del contrato', () => {
    expect(Object.keys(ETIQUETA_TIPO_ACCION).sort()).toEqual(
      ['correo', 'llamada', 'otro', 'reunion', 'whatsapp'].sort(),
    )
  })

  it('no contiene "email", que no es un valor del backend', () => {
    expect(ETIQUETA_TIPO_ACCION).not.toHaveProperty('email')
  })

  it('da etiqueta legible a correo', () => {
    expect(ETIQUETA_TIPO_ACCION.correo).toBe('Correo')
  })
})

describe('ETIQUETA_ROL', () => {
  it('cubre exactamente los valores de rol_empleado del contrato', () => {
    expect(Object.keys(ETIQUETA_ROL).sort()).toEqual(
      ['admin', 'analista', 'gerencia', 'jdv', 'otro', 'vendedor'].sort(),
    )
  })

  it('da etiqueta legible a otro', () => {
    expect(ETIQUETA_ROL.otro).toBe('Otro')
  })
})
