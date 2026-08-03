import { get, post, put, patch } from './client'
import type { ActualizarEmpleadoInput, CrearEmpleadoInput, Empleado, Rol } from '@/types'

export const empleadosApi = {
  listar: async (params?: { activo?: boolean; rol?: Rol }): Promise<Empleado[]> => {
    const res = await get<Empleado[]>('/empleados', params)
    return res.data
  },

  crear: async (input: CrearEmpleadoInput): Promise<Empleado> => {
    const res = await post<Empleado>('/empleados', input)
    return res.data
  },

  actualizar: async (id: number, input: ActualizarEmpleadoInput): Promise<Empleado> => {
    const res = await put<Empleado>(`/empleados/${id}`, input)
    return res.data
  },

  cambiarActivo: async (id: number, activo: boolean): Promise<Empleado> => {
    const res = await patch<Empleado>(`/empleados/${id}/activo`, { activo })
    return res.data
  },
}
