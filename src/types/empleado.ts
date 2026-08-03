import type { Rol } from './enums'

export interface EmpleadoResumen {
  id: number
  nombres: string
  apellidos: string
}

export interface Empleado extends EmpleadoResumen {
  email: string
  rol: Rol
  area: string
  puesto: string
  activo?: boolean
  requiere_cambio_contrasena?: boolean
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  empleado: Empleado
}

export interface CrearEmpleadoInput {
  nombres: string
  apellidos: string
  email: string
  password: string
  rol: Rol
  area: string
  puesto: string
}

export type ActualizarEmpleadoInput = Partial<Omit<CrearEmpleadoInput, 'password'>>
