import { describe, expect, it, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useNavItems } from './navItems'
import { useAuthStore } from '@/store/authStore'
import type { Empleado, Rol } from '@/types'

function empleadoCon(rol: Rol): Empleado {
  return {
    id: 1,
    nombres: 'Ana',
    apellidos: 'Ruiz',
    email: 'ana@quantum.pe',
    rol,
    area: 'Ventas',
    puesto: 'Vendedor',
    activo: true,
  }
}

function destinosPara(rol: Rol): string[] {
  useAuthStore.setState({ empleado: empleadoCon(rol), cargando: false })
  const { result, unmount } = renderHook(() => useNavItems())
  const destinos = result.current.map((item) => item.to)
  unmount()
  return destinos
}

describe('useNavItems — módulo de Simulaciones (Plan 05, T2.2, K35/D31)', () => {
  afterEach(() => {
    useAuthStore.setState({ empleado: null, cargando: false })
  })

  it('no muestra la entrada de Simulaciones al vendedor', () => {
    // Encargo §6: "El vendedor NO ve la entrada al módulo Simulaciones en la
    // navegación. Llega por el simulador de su oportunidad y por la Calculadora."
    expect(destinosPara('vendedor')).not.toContain('/simulaciones')
  })

  it('sí muestra la Calculadora al vendedor', () => {
    expect(destinosPara('vendedor')).toContain('/calculadora')
  })

  it('no muestra ninguna de las dos a jdv', () => {
    const destinos = destinosPara('jdv')
    expect(destinos).not.toContain('/simulaciones')
    expect(destinos).not.toContain('/calculadora')
  })

  it('no muestra ninguna de las dos a otro', () => {
    const destinos = destinosPara('otro')
    expect(destinos).not.toContain('/simulaciones')
    expect(destinos).not.toContain('/calculadora')
  })

  it('muestra ambas a analista', () => {
    // §2.15: analista es el rol DUEÑO del módulo — el caso invertido respecto
    // al resto del CRM.
    const destinos = destinosPara('analista')
    expect(destinos).toContain('/simulaciones')
    expect(destinos).toContain('/calculadora')
  })

  it('muestra ambas a admin y gerencia', () => {
    for (const rol of ['admin', 'gerencia'] as const) {
      const destinos = destinosPara(rol)
      expect(destinos).toContain('/simulaciones')
      expect(destinos).toContain('/calculadora')
    }
  })
})
