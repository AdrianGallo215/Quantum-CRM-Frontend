import { describe, expect, it } from 'vitest'
import { renderConProviders, screen } from '@/test/utilidades'
import type { CambioAuditoria } from '@/types'
import { TimelineAuditoria } from './TimelineAuditoria'

function cambio(over: Partial<CambioAuditoria> = {}): CambioAuditoria {
  return {
    id: 10,
    campo: 'descripcion',
    valor_anterior: 'Llamar mañana',
    valor_nuevo: 'Llamar hoy urgente',
    changed_at: '2026-09-07T16:00:00Z',
    changed_by: 1,
    autor: { id: 1, nombres: 'Admin', apellidos: 'Sistema' },
    ...over,
  }
}

describe('TimelineAuditoria', () => {
  it('muestra el campo traducido, el valor anterior y el nuevo', () => {
    renderConProviders(<TimelineAuditoria cambios={[cambio()]} />)
    expect(screen.getByText(/Descripción/)).toBeInTheDocument()
    expect(screen.getByText(/Llamar mañana/)).toBeInTheDocument()
    expect(screen.getByText(/Llamar hoy urgente/)).toBeInTheDocument()
  })

  it('muestra "(vacío)" cuando el campo no tenía valor previo', () => {
    renderConProviders(<TimelineAuditoria cambios={[cambio({ valor_anterior: null })]} />)
    expect(screen.getByText(/\(vacío\)/)).toBeInTheDocument()
  })

  it('muestra un vacío explícito cuando la actividad nunca se editó', () => {
    renderConProviders(<TimelineAuditoria cambios={[]} />)
    expect(screen.getByText(/sin ediciones/i)).toBeInTheDocument()
  })
})
