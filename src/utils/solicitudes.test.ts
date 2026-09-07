import { describe, expect, it } from 'vitest'
import type { Solicitud } from '@/types'
import { aprobadorParaDcto, limiteDctoDirecto, rutaDeSolicitud } from './solicitudes'

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

describe('rutaDeSolicitud', () => {
  it('no navega a /empresas cuando la entidad es un ítem de oportunidad', () => {
    // Regresión de K8: el ternario viejo mandaba `oportunidad_item` al `else` y
    // navegaba a /empresas/<id del ítem> — la empresa equivocada, no un 404.
    const s = { entidad_tipo: 'oportunidad_item', entidad_id: 502 } as Solicitud
    expect(rutaDeSolicitud(s)).toBeNull()
  })

  it('mantiene la ruta de empresa y de oportunidad', () => {
    expect(rutaDeSolicitud({ entidad_tipo: 'empresa', entidad_id: 12 } as Solicitud)).toBe(
      '/empresas/12',
    )
    expect(rutaDeSolicitud({ entidad_tipo: 'oportunidad', entidad_id: 101 } as Solicitud)).toBe(
      '/oportunidades/101',
    )
  })
})
