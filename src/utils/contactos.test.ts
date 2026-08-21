import { describe, expect, it } from 'vitest'
import { resumenEmpresas } from './contactos'

describe('resumenEmpresas', () => {
  it('devuelve un guion largo si no hay empresas', () => {
    expect(resumenEmpresas([])).toBe('—')
    expect(resumenEmpresas(undefined)).toBe('—')
  })

  it('devuelve la razon social sola si hay exactamente una', () => {
    expect(
      resumenEmpresas([{ id: 1, razon_social: 'Transportes Lima', cargo: null }]),
    ).toBe('Transportes Lima')
  })

  it('añade el contador de restantes si hay dos o más', () => {
    expect(
      resumenEmpresas([
        { id: 1, razon_social: 'Transportes Lima', cargo: null },
        { id: 2, razon_social: 'Buses Norte', cargo: null },
        { id: 3, razon_social: 'Turismo Sur', cargo: null },
      ]),
    ).toBe('Transportes Lima +2')
  })
})
