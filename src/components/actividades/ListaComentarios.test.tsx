import { describe, expect, it } from 'vitest'
import { renderConProviders, screen } from '@/test/utilidades'
import type { ComentarioActividad } from '@/types'
import { ListaComentarios } from './ListaComentarios'

function comentario(over: Partial<ComentarioActividad> = {}): ComentarioActividad {
  return {
    id: 1,
    tipo: 'tarea',
    id_actividad: 42,
    texto: 'Se habló con el contacto, pide cotización.',
    created_at: '2026-09-05T09:30:00Z',
    created_by: 7,
    autor: { id: 7, nombres: 'Juan', apellidos: 'Pérez' },
    ...over,
  }
}

describe('ListaComentarios', () => {
  it('muestra el texto y el autor de cada comentario', () => {
    renderConProviders(<ListaComentarios comentarios={[comentario()]} />)
    expect(screen.getByText(/pide cotización/i)).toBeInTheDocument()
    expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument()
  })

  it('respeta el orden en que llegan: el backend ya los manda cronológicos', () => {
    // informe §9: `created_at ASC`. Reordenar en el cliente es un bug silencioso.
    renderConProviders(
      <ListaComentarios
        comentarios={[
          comentario({ id: 1, texto: 'primero' }),
          comentario({ id: 2, texto: 'segundo' }),
        ]}
      />,
    )
    const textos = screen.getAllByTestId('texto-comentario').map((n) => n.textContent)
    expect(textos).toEqual(['primero', 'segundo'])
  })

  it('muestra un vacío explícito cuando no hay comentarios', () => {
    renderConProviders(<ListaComentarios comentarios={[]} />)
    expect(screen.getByText(/sin comentarios/i)).toBeInTheDocument()
  })

  it('no muestra el vacío mientras está cargando', () => {
    renderConProviders(<ListaComentarios comentarios={[]} cargando />)
    expect(screen.queryByText(/sin comentarios/i)).not.toBeInTheDocument()
  })

  it('muestra un autor desconocido sin romperse si `autor` es null', () => {
    renderConProviders(<ListaComentarios comentarios={[comentario({ autor: null })]} />)
    expect(screen.getByText(/pide cotización/i)).toBeInTheDocument()
  })
})
