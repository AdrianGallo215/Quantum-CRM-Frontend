import { describe, expect, it } from 'vitest'
import { ROLES_APOYO, ROLES_COTIZADOR, ROLES_FACTURA } from './authStore'

describe('ROLES_APOYO', () => {
  it('son exactamente analista y otro — sin cartera propia desde 2026-08-18 (contrato §25)', () => {
    expect([...ROLES_APOYO].sort()).toEqual(['analista', 'otro'])
  })
})

describe('ROLES_FACTURA', () => {
  it('ya no incluye analista — perdió el privilegio al pasar a rol de apoyo (contrato §3.7)', () => {
    expect(ROLES_FACTURA).not.toContain('analista')
    expect([...ROLES_FACTURA].sort()).toEqual(['admin', 'gerencia'])
  })
})

describe('ROLES_COTIZADOR', () => {
  it('incluye admin — opera el sistema y también cotiza (2026-08-24)', () => {
    expect(ROLES_COTIZADOR).toContain('admin')
  })

  it('excluye a los roles de apoyo, que no llevan cartera propia', () => {
    for (const rol of ROLES_APOYO) {
      expect(ROLES_COTIZADOR).not.toContain(rol)
    }
  })

  it('son exactamente estos cuatro', () => {
    expect([...ROLES_COTIZADOR].sort()).toEqual(['admin', 'gerencia', 'jdv', 'vendedor'])
  })
})
