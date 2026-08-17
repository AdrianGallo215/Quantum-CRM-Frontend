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
 *
 * `requiere_cambio_contrasena` vive en la RAÍZ de esta respuesta, no dentro de
 * `empleado` — el backend confirmó que `EmpleadoDto` nunca tuvo ese campo.
 * Leerlo de `empleado.requiere_cambio_contrasena` (como hacía este tipo antes)
 * siempre da `undefined`, así que el aviso de cambio de contraseña obligatorio
 * se salta en silencio. `GET /empleados/me` tampoco lo devuelve (usa la misma
 * forma que `GET /empleados`). Desde el 2026-08-17 `GET /empleados/me` SÍ lo
 * devuelve, así que el flujo sobrevive a una recarga de página.
 *
 * Sigue siendo opcional en `Empleado` porque el listado `GET /empleados` no lo
 * incluye y ambos comparten este tipo.
 */
export interface LoginResponse {
  expires_in: number
  requiere_cambio_contrasena: boolean
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
