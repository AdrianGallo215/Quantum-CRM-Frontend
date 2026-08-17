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

/**
 * Respuesta de `POST /auth/login` (contrato §6).
 *
 * Los tokens NO viajan aquí: van en las cookies httpOnly `access_token` y
 * `refresh_token` que setea el backend (contrato §1). Este tipo declaró
 * `access_token`/`refresh_token` desde el MVP por un error del contrato
 * original; el backend confirmó que nunca los devolvió en el body. Si vuelven
 * a aparecer aquí, es un fallo de seguridad, no una mejora.
 */
export interface LoginResponse {
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
