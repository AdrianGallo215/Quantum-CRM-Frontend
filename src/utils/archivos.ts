import { codigoDeError, estadoHttpDeError, mensajeDeError } from '@/api/client'

/**
 * Límite de subida. Se valida en el cliente para no gastar una subida larga que
 * terminará en 413. Constante configurable — nunca escribir el número suelto en la UI.
 *
 * Confirmado con el equipo de backend (2026-07-31): el límite del servidor es
 * 104_857_600 bytes, es decir MiB (100 × 1024 × 1024), no MB decimales — por eso
 * el cálculo de abajo coincide byte a byte. Además, el framing del multipart
 * (boundary, headers, CRLFs) NO cuenta contra ese límite: el backend mide el
 * contenido ya desenmarcado, así que comparar contra `file.size` es exacto y no
 * hace falta reservar margen.
 */
export const MAX_TAMANO_ARCHIVO_MB = 100
export const MAX_TAMANO_ARCHIVO_BYTES = MAX_TAMANO_ARCHIVO_MB * 1024 * 1024

/**
 * Ícono Material Symbols según el mime_type, con genérico de respaldo.
 *
 * ⚠️ El ORDEN de los checks importa: los mimes de Office comparten el fragmento
 * "officedocument" (p. ej. `...officedocument.spreadsheetml.sheet`), así que
 * hoja de cálculo y presentación se evalúan ANTES que el check genérico de
 * documento; al revés, un Excel se mostraría con ícono de Word.
 */
export function iconoDeMime(mime: string | null | undefined): string {
  const m = (mime ?? '').toLowerCase()
  if (m === 'application/pdf') return 'picture_as_pdf'
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('video/')) return 'movie'
  if (m.startsWith('audio/')) return 'audio_file'
  if (m.includes('spreadsheet') || m.includes('ms-excel') || m === 'text/csv') return 'table'
  if (m.includes('presentation') || m.includes('ms-powerpoint')) return 'slideshow'
  if (m.includes('word') || m.includes('document')) return 'description'
  if (m.includes('zip') || m.includes('compressed') || m.includes('rar') || m.includes('tar')) {
    return 'folder_zip'
  }
  if (m.startsWith('text/')) return 'article'
  return 'draft'
}

export interface ErrorSubida {
  mensaje: string
  /** true → ofrecer al usuario un botón de reintento con el mismo archivo */
  reintentable: boolean
}

/**
 * Único texto para "archivo demasiado grande", sea que lo detecte la validación
 * en cliente (antes de subir) o el backend (413 ARCHIVO_DEMASIADO_GRANDE). No
 * duplicar este mensaje en ningún otro archivo.
 */
export function errorArchivoDemasiadoGrande(): ErrorSubida {
  return {
    mensaje: `El archivo supera el tamaño máximo permitido (${MAX_TAMANO_ARCHIVO_MB} MB)`,
    reintentable: false,
  }
}

/**
 * Errores comunes a toda operación contra Drive (subir un archivo y crear la
 * carpeta comparten exactamente estos 502 y el mismo 404). `fallback` describe
 * la operación concreta, para que el mensaje diga qué falló.
 *
 * NO_ENCONTRADO (404) no tiene caso propio: cae al genérico, que usa el mensaje
 * del backend — mismo tratamiento que cualquier otro 404 del proyecto.
 */
function mensajeErrorDrive(error: unknown, fallback: string): ErrorSubida {
  switch (codigoDeError(error)) {
    case 'DRIVE_NO_DISPONIBLE':
      return {
        mensaje: 'No se pudo conectar con Google Drive. Intenta de nuevo en unos minutos',
        reintentable: true,
      }

    case 'DRIVE_SIN_CUOTA':
      // Error de configuración del backend, no accionable por el usuario. El
      // frontend no tiene servicio de error reporting (no hay Sentry ni similar),
      // así que se registra en consola con prefijo crítico para soporte.
      console.error(
        '[CRITICO][DRIVE_SIN_CUOTA] Google Drive sin cuota disponible — requiere revisión del backend',
        error,
      )
      return { mensaje: `${fallback}. Avisa al equipo técnico`, reintentable: false }
  }

  return { mensaje: mensajeDeError(error, fallback), reintentable: false }
}

/**
 * Traduce el error de una SUBIDA, en tres niveles de precisión:
 *
 * 1. Código de negocio del envelope — el caso normal, viene de nuestra API.
 * 2. Status HTTP crudo — para respuestas que NO traen envelope. El deploy corre
 *    detrás del proxy de borde de la plataforma (Render/Railway), que puede
 *    cortar una subida demasiado grande antes de que llegue a la API: ese 413 no
 *    tiene `error.code`, pero 413 significa una sola cosa y podemos ser precisos.
 * 3. Los errores comunes de Drive y, al final, el mensaje genérico.
 */
export function mensajeErrorSubida(error: unknown): ErrorSubida {
  switch (codigoDeError(error)) {
    case 'VALIDACION':
      return { mensaje: 'Selecciona un archivo antes de subir', reintentable: false }

    case 'ARCHIVO_DEMASIADO_GRANDE':
      return errorArchivoDemasiadoGrande()
  }

  // Sin envelope reconocible. Un 413 solo puede significar "demasiado grande",
  // venga de nuestra API o del proxy de la plataforma.
  if (estadoHttpDeError(error) === 413) {
    return errorArchivoDemasiadoGrande()
  }

  return mensajeErrorDrive(error, 'No se pudo subir el documento')
}

/**
 * Traduce el error de CREAR LA CARPETA. El endpoint solo puede fallar con
 * 404 NO_ENCONTRADO o los dos 502 de Drive — ninguno específico de archivos.
 */
export function mensajeErrorCarpeta(error: unknown): ErrorSubida {
  return mensajeErrorDrive(error, 'No se pudo crear la carpeta')
}
