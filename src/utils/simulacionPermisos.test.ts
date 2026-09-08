import { describe, expect, it } from 'vitest'
import type { Empleado, Oportunidad, Rol } from '@/types'
import {
  puedeSimularEnOportunidad,
  puedeUsarCalculadora,
  puedeVerModuloSimulaciones,
} from './simulacionPermisos'

/** Empleado mínimo con el rol indicado. `id` fijo salvo que se pida otro. */
function empleadoCon(rol: Rol, id = 7): Empleado {
  return {
    id,
    nombres: 'Ada',
    apellidos: 'Lovelace',
    email: 'ada@quantum.pe',
    rol,
    area: 'Comercial',
    puesto: 'Analista',
  }
}

/** Solo `id_vendedor` importa para el permiso por recurso (§2.15). */
function oportunidadDe(idVendedor: number): Pick<Oportunidad, 'id_vendedor'> {
  return { id_vendedor: idVendedor }
}

describe('simulacionPermisos', () => {
  // Tabla de verdad de `matriz_permisos.md` §2.15: 6 roles × 3 capacidades.
  describe('puedeVerModuloSimulaciones', () => {
    it.each(['admin', 'gerencia', 'analista'] as const)('permite a %s', (rol) => {
      expect(puedeVerModuloSimulaciones(empleadoCon(rol))).toBe(true)
    })

    it.each(['vendedor', 'jdv', 'otro'] as const)('niega a %s', (rol) => {
      expect(puedeVerModuloSimulaciones(empleadoCon(rol))).toBe(false)
    })

    it('niega sin sesión', () => {
      expect(puedeVerModuloSimulaciones(null)).toBe(false)
    })
  })

  describe('puedeUsarCalculadora', () => {
    // `vendedor` SÍ entra acá aunque no entre al módulo — es la diferencia clave (K17).
    it.each(['admin', 'gerencia', 'analista', 'vendedor'] as const)('permite a %s', (rol) => {
      expect(puedeUsarCalculadora(empleadoCon(rol))).toBe(true)
    })

    it.each(['jdv', 'otro'] as const)('niega a %s', (rol) => {
      expect(puedeUsarCalculadora(empleadoCon(rol))).toBe(false)
    })

    it('niega sin sesión', () => {
      expect(puedeUsarCalculadora(null)).toBe(false)
    })
  })

  describe('puedeSimularEnOportunidad', () => {
    it('permite al vendedor asignado de esa oportunidad', () => {
      expect(puedeSimularEnOportunidad(empleadoCon('vendedor', 7), oportunidadDe(7))).toBe(true)
    })

    it('NIEGA al vendedor que no es el asignado', () => {
      expect(puedeSimularEnOportunidad(empleadoCon('vendedor', 7), oportunidadDe(99))).toBe(false)
    })

    it.each(['admin', 'gerencia', 'analista'] as const)(
      'permite a %s en cualquier oportunidad',
      (rol) => {
        expect(puedeSimularEnOportunidad(empleadoCon(rol, 7), oportunidadDe(99))).toBe(true)
      },
    )

    it('niega a jdv aunque supervise el equipo', () => {
      expect(puedeSimularEnOportunidad(empleadoCon('jdv', 7), oportunidadDe(7))).toBe(false)
    })

    it('niega a otro', () => {
      expect(puedeSimularEnOportunidad(empleadoCon('otro', 7), oportunidadDe(7))).toBe(false)
    })

    it('niega sin sesión', () => {
      expect(puedeSimularEnOportunidad(null, oportunidadDe(7))).toBe(false)
    })
  })

  it('no reutiliza ROLES_APOYO: analista entra y otro no', () => {
    // Regresión de K16. ROLES_APOYO agrupa analista con otro, que aquí están en
    // extremos opuestos. El backend cometió este error y tuvo que centralizar.
    expect(puedeVerModuloSimulaciones(empleadoCon('analista'))).toBe(true)
    expect(puedeVerModuloSimulaciones(empleadoCon('otro'))).toBe(false)
  })

  it('no reutiliza ROLES_SUPERVISION: jdv no entra', () => {
    expect(puedeVerModuloSimulaciones(empleadoCon('jdv'))).toBe(false)
  })
})
