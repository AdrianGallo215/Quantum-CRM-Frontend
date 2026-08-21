import { describe, expect, it } from 'vitest'
import { qk } from './queryKeys'

/**
 * La promesa del módulo es que invalidar la lista alcanza también a los detalles.
 * Eso solo es cierto si la key del detalle EMPIEZA por la key de la lista —
 * que es exactamente el criterio de prefijo que usa TanStack Query.
 */
function esPrefijoDe(prefijo: readonly unknown[], key: readonly unknown[]): boolean {
  return prefijo.every((parte, i) => key[i] === parte)
}

describe('qk — jerarquía de prefijos', () => {
  it('el detalle de empresa cuelga de la lista de empresas', () => {
    expect(esPrefijoDe(qk.empresas, qk.empresa(5))).toBe(true)
  })

  it('los eventos de empresa cuelgan del detalle de empresa', () => {
    expect(esPrefijoDe(qk.empresa(5), qk.empresaEventos(5))).toBe(true)
  })

  it('el detalle de oportunidad cuelga de la lista de oportunidades', () => {
    expect(esPrefijoDe(qk.oportunidades, qk.oportunidad(5))).toBe(true)
  })

  it('el log y los eventos cuelgan del detalle de oportunidad', () => {
    expect(esPrefijoDe(qk.oportunidad(5), qk.oportunidadLog(5))).toBe(true)
    expect(esPrefijoDe(qk.oportunidad(5), qk.oportunidadEventos(5))).toBe(true)
  })

  it('el detalle de contacto cuelga de la lista de contactos', () => {
    expect(esPrefijoDe(qk.contactos, qk.contacto(5))).toBe(true)
  })

  it('el detalle de solicitud cuelga de la lista de solicitudes', () => {
    expect(esPrefijoDe(qk.solicitudes, qk.solicitud(5))).toBe(true)
  })

  it('detalles de entidades distintas no colisionan', () => {
    expect(esPrefijoDe(qk.empresas, qk.oportunidad(5))).toBe(false)
    expect(esPrefijoDe(qk.empresa(5), qk.empresa(6))).toBe(false)
  })
})
