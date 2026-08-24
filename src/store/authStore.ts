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

/**
 * Roles que pueden confirmar el paso a facturado. `analista` perdió este
 * privilegio el 2026-08-18 al pasar a rol de apoyo (contrato §3.7, §25).
 */
export const ROLES_FACTURA: Rol[] = ['admin', 'gerencia']

/**
 * Roles de apoyo (2026-08-18, contrato §25): sin cartera propia. Su
 * visibilidad sobre empresas/oportunidades se reduce a donde colaboran vía
 * tarea (`ids_colaboradores`), y NINGUNA escritura sobre esos dos recursos
 * les está permitida — el backend responde `403 PERMISO_INSUFICIENTE` a
 * crear, editar, cambiar estado, subir archivos a Drive, vincular contacto a
 * una oportunidad, aplicar descuento (por ninguna vía) o crear una solicitud.
 * Eventos y la vinculación de contactos a una EMPRESA (no a una oportunidad)
 * quedan exentos — no tienen guard de escritura propio en el backend
 * (asimetría documentada, no un descuido; ver `matriz_permisos.md §2.3/§2.5`).
 */
export const ROLES_APOYO: Rol[] = ['analista', 'otro']
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
/**
 * Roles que ven el FAB de los cotizadores externos. `admin` se añadió el
 * 2026-08-24: opera el sistema y necesita cotizar igual que el resto. Los
 * roles de apoyo (`ROLES_APOYO`) siguen fuera: no llevan cartera propia.
 *
 * Es puramente UX: los cotizadores son sistemas externos con su propia
 * autenticación. Esta lista no protege nada, solo evita ofrecer un enlace
 * inútil a quien no cotiza.
 */
export const ROLES_COTIZADOR: Rol[] = ['admin', 'vendedor', 'jdv', 'gerencia']
