import { describe, expect, it } from 'vitest'
import { aprobadorParaDcto, limiteDctoDirecto } from './solicitudes'

describe('limiteDctoDirecto', () => {
  it('da 3 a vendedor', () => {
    expect(limiteDctoDirecto('vendedor')).toBe(3)
  })

  it('da 7 a jdv', () => {
    expect(limiteDctoDirecto('jdv')).toBe(7)
  })

  it('da null (sin límite) a gerencia y admin', () => {
    expect(limiteDctoDirecto('gerencia')).toBeNull()
    expect(limiteDctoDirecto('admin')).toBeNull()
  })

  // Actualizado 2026-08-20: `analista` y `otro` son "roles de apoyo" desde el
  // PR #9 de backend (contrato §25) — no aplican descuento por ninguna vía, ni
  // directo ni por solicitud. `analista` tenía 3 antes de ese cambio; ya no.
  it('no da margen de descuento directo a los roles de apoyo (analista, otro)', () => {
    expect(limiteDctoDirecto('analista')).toBe(0)
    expect(limiteDctoDirecto('otro')).toBe(0)
  })
})

describe('aprobadorParaDcto', () => {
  it('no pide aprobación dentro del límite', () => {
    expect(aprobadorParaDcto('vendedor', 3)).toBeNull()
    expect(aprobadorParaDcto('jdv', 7)).toBeNull()
  })

  it('no pide aprobación nunca a gerencia ni admin', () => {
    expect(aprobadorParaDcto('gerencia', 99)).toBeNull()
    expect(aprobadorParaDcto('admin', 99)).toBeNull()
  })

  it('escala a jdv un dcto de vendedor entre su límite y 7', () => {
    expect(aprobadorParaDcto('vendedor', 5)).toBe('jdv')
    expect(aprobadorParaDcto('analista', 7)).toBe('jdv')
  })

  it('escala a gerencia por encima de 7', () => {
    expect(aprobadorParaDcto('vendedor', 8)).toBe('gerencia')
    expect(aprobadorParaDcto('jdv', 8)).toBe('gerencia')
  })

  // `otro` no tiene ninguna relación con la autoridad de revisión de `jdv`: el
  // contrato §2 solo le da a `jdv` competencia sobre descuentos de vendedor/analista.
  // Un rol sin límite propio definido escala directo a gerencia, la autoridad máxima.
  it('escala cualquier dcto positivo del rol otro directo a gerencia, no a jdv', () => {
    expect(aprobadorParaDcto('otro', 1)).toBe('gerencia')
  })
})
