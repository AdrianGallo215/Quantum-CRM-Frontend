import { get, post, put, patch } from './client'
import type { ActualizarTareaInput, CrearTareaInput, Tarea, TareasFiltros } from '@/types'

export const tareasApi = {
  listar: async (filtros?: TareasFiltros): Promise<Tarea[]> => {
    const res = await get<Tarea[]>('/tareas', filtros as Record<string, unknown>)
    return res.data
  },

  crear: async (input: CrearTareaInput): Promise<Tarea> => {
    const res = await post<Tarea>('/tareas', input)
    return res.data
  },

  completar: async (id: number, descripcion?: string | null): Promise<void> => {
    await patch(`/tareas/${id}/completada`, { descripcion: descripcion ?? null })
  },

  cancelar: async (id: number): Promise<void> => {
    await patch(`/tareas/${id}/cancelada`, {})
  },

  actualizar: async (id: number, input: ActualizarTareaInput): Promise<Tarea> => {
    const res = await put<Tarea>(`/tareas/${id}`, input)
    return res.data
  },
}
