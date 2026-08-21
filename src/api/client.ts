import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import type { ApiError, ApiResponse } from '@/types'
import { useAuthStore } from '@/store/authStore'

// El token vive en cookie httpOnly — el JS nunca lo lee ni lo guarda.
// withCredentials hace que el navegador adjunte la cookie en cada request.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

interface RetriableConfig extends AxiosRequestConfig {
  _retry?: boolean
}

let refreshPromise: Promise<void> | null = null

async function refreshSession(): Promise<void> {
  // Un solo refresh en vuelo; el refresh_token viaja en cookie httpOnly.
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${apiClient.defaults.baseURL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined
    const status = error.response?.status
    const url = config?.url ?? ''
    // Endpoints de credenciales: un 401 aquí significa "las credenciales que
    // acabas de escribir son incorrectas", no "tu sesión caducó". Refrescar y
    // reintentar reenviaría la contraseña equivocada y duplicaría el intento
    // fallido contra el contador del servidor (contrato §6).
    const esAuth =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/cambiar-contrasena')

    if (status === 401 && config && !config._retry && !esAuth) {
      config._retry = true
      try {
        await refreshSession()
        return apiClient.request(config)
      } catch {
        // Refresh falló → sesión terminada. Se limpia el store para que
        // RequireAuth mande a /login por navegación SPA. `assign()` no servía
        // aquí: es asíncrono, así que N peticiones fallando a la vez pasaban
        // todas el chequeo de pathname y encadenaban N navegaciones.
        useAuthStore.getState().limpiar()
      }
    }

    /**
     * Cambio de contraseña obligatorio: mientras el flag esté activo el backend
     * responde 403 a TODO salvo /auth/cambiar-contrasena, /auth/logout y
     * /empleados/me. Sin este bloque el usuario vería "no tienes permiso" por
     * toda la app, que es exactamente el diagnóstico equivocado.
     *
     * Hace falta aunque el guard del router ya mire el flag: el guard solo lo
     * evalúa al montar, y el caso que importa es que un admin resetee la
     * contraseña a mitad de sesión, con el usuario ya navegando. El polling de
     * notificaciones (45 s) dispara el 403 él solo.
     *
     * Se distingue por `code`, no por el 403 a secas: un 403 normal
     * (PERMISO_INSUFICIENTE) debe seguir mostrando la pantalla "Sin acceso".
     *
     * Solo se marca el flag en el store — la navegación la hace RequireAuth, que
     * ya redirige de forma declarativa leyendo ese mismo campo. Antes esto era
     * `window.location.assign()` con una bandera de módulo que nunca se reseteaba:
     * la recarga completa tiraba cualquier formulario abierto, y si el documento
     * sobrevivía (bfcache al pulsar Atrás) la bandera quedaba trabada en `true` y
     * desactivaba este bloque para siempre.
     */
    if (status === 403 && extraerApiError(error)?.code === 'CAMBIO_CONTRASENA_REQUERIDO') {
      const { empleado, setEmpleado } = useAuthStore.getState()
      if (empleado && !empleado.requiere_cambio_contrasena) {
        setEmpleado({ ...empleado, requiere_cambio_contrasena: true })
      }
    }

    return Promise.reject(error)
  },
)

/** Extrae el error de negocio del envelope de la API, si existe. */
export function extraerApiError(error: unknown): ApiError | null {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiResponse<unknown> | undefined
    if (body && typeof body === 'object' && body.error) {
      return body.error
    }
  }
  return null
}

/** Mensaje legible para mostrar al usuario ante cualquier error HTTP. */
export function mensajeDeError(error: unknown, fallback = 'Ocurrió un error inesperado'): string {
  const apiError = extraerApiError(error)
  if (apiError?.message) return apiError.message
  if (axios.isAxiosError(error) && !error.response) {
    return 'No se pudo conectar con el servidor'
  }
  return fallback
}

/** Código de negocio del envelope (p. ej. 'APROBACION_REQUERIDA'), o null. */
export function codigoDeError(error: unknown): string | null {
  return extraerApiError(error)?.code ?? null
}

/**
 * Status HTTP crudo de la respuesta, o null si el error no llegó a tenerla.
 * Útil cuando un proxy de borde corta la petición antes de llegar a la API: en
 * ese caso no hay envelope y el `code` de negocio no existe, pero el status sí.
 */
export function estadoHttpDeError(error: unknown): number | null {
  if (axios.isAxiosError(error)) return error.response?.status ?? null
  return null
}

// Helpers HTTP que devuelven el envelope completo (data + meta)
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const res = await apiClient.get<ApiResponse<T>>(url, { params })
  return res.data
}

export async function post<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const res = await apiClient.post<ApiResponse<T>>(url, body)
  return res.data
}

export async function put<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const res = await apiClient.put<ApiResponse<T>>(url, body)
  return res.data
}

export async function patch<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const res = await apiClient.patch<ApiResponse<T>>(url, body)
  return res.data
}

export async function del(url: string): Promise<void> {
  await apiClient.delete(url)
}
