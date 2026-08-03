/**
 * Headless Storage: el CRM no guarda documentos en disco propio — viven en la
 * carpeta de Google Drive que el backend crea automáticamente para cada
 * Empresa y cada Oportunidad.
 */

/** Entidad dueña de la carpeta. El cliente API lo traduce al segmento de URL. */
export type TipoEntidadArchivo = 'empresa' | 'oportunidad'

/**
 * Respuesta de POST /{empresas|oportunidades}/:id/carpeta-drive.
 * El endpoint es idempotente: si la entidad ya tiene carpeta, devuelve la
 * existente sin tocar Drive.
 */
export interface CarpetaDriveCreada {
  drive_folder_id: string
}

/** Ítem del listado y respuesta 201 de la subida — misma forma en ambos casos. */
export interface ArchivoDrive {
  /** ID de Drive (string alfanumérico, NO numérico como el resto de IDs del CRM) */
  id: string
  nombre: string
  /** Puede venir null en casos raros → el nombre no debe ser clicable */
  url: string | null
  tamano_bytes: number
  mime_type: string
}
