import { create } from 'zustand'
import type { Empleado, Rol } from '@/types'

/**
 * Client state de sesión. El token NUNCA vive aquí ni en localStorage:
 * vive en cookie httpOnly que el navegador adjunta solo.
 * `empleado` es la identidad de la sesión (quién soy, qué rol tengo) para la UX.
 */
interface AuthState {
  empleado: Empleado | null
  cargando: boolean
  setEmpleado: (empleado: Empleado | null) => void
  setCargando: (cargando: boolean) => void
  limpiar: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  empleado: null,
  cargando: true,
  setEmpleado: (empleado) => set({ empleado, cargando: false }),
  setCargando: (cargando) => set({ cargando }),
  limpiar: () => set({ empleado: null, cargando: false }),
}))

export function tieneRol(empleado: Empleado | null, roles: Rol[]): boolean {
  return empleado !== null && roles.includes(empleado.rol)
}

/** Roles que pueden confirmar el paso a facturado */
export const ROLES_FACTURA: Rol[] = ['admin', 'gerencia', 'analista']
/** Roles con acceso a reportes */
export const ROLES_REPORTES: Rol[] = ['admin', 'gerencia', 'jdv']
/** Roles de supervisión (reasignar, traspasar, ver equipo) */
export const ROLES_SUPERVISION: Rol[] = ['admin', 'gerencia', 'jdv']
/** Roles que ven la vista Gerencia (bandeja de aprobación global) */
export const ROLES_BANDEJA_GERENCIA: Rol[] = ['gerencia', 'admin']
/** Roles que ven /solicitudes: crean solicitudes y/o aprueban las suyas (§4.1, §4.2) */
export const ROLES_SOLICITANTES: Rol[] = ['vendedor', 'analista', 'jdv']
/** Único rol que puede eliminar empresas/oportunidades. Ocultar el botón es UX — el backend rechaza con 403 a cualquier no-admin */
export const ROLES_ADMIN: Rol[] = ['admin']
