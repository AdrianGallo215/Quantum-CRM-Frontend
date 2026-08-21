import { describe, expect, it } from 'vitest'
import { ROLES_APOYO, ROLES_FACTURA } from './authStore'

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
