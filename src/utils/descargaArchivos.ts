/**
 * Extrae el filename sugerido de un header `Content-Disposition` (p. ej.
 * `attachment; filename="gestion-comercial-2026-09-08.xlsx"`). Es solo una
 * sugerencia del servidor (contrato §3), así que ante cualquier ausencia se usa
 * `porDefecto` en vez de fallar.
 */
export function nombreArchivoDesde(
  contentDisposition: string | undefined | null,
  porDefecto: string,
): string {
  if (!contentDisposition) return porDefecto
  const match = /filename="?([^";]+)"?/i.exec(contentDisposition)
  return match?.[1] ?? porDefecto
}

/**
 * Dispara la descarga de un `Blob` ya recibido del servidor, vía un enlace
 * temporal clickeado programáticamente. Separado a propósito del código que
 * llama a la API para que ese código sea testeable sin `Blob` ni
 * `URL.createObjectURL` (mismo criterio que `descargarCronogramaExcel`).
 */
export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob)
  try {
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombreArchivo
    document.body.appendChild(enlace)
    enlace.click()
    document.body.removeChild(enlace)
  } finally {
    URL.revokeObjectURL(url)
  }
}
