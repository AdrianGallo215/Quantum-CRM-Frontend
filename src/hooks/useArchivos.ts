import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { archivosApi } from '@/api/archivos'
import type { TipoEntidadArchivo } from '@/types'
import { invalidar, qk } from './queryKeys'

export function useArchivos(tipo: TipoEntidadArchivo, id: number) {
  return useQuery({
    queryKey: qk.archivos(tipo, id),
    queryFn: () => archivosApi.listar(tipo, id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

/**
 * Invalidación compartida por las dos mutaciones que pueden crear la carpeta.
 *
 * Además de la lista, invalida el detalle de la entidad (empresa/oportunidad):
 * ese detalle es quien trae `drive_folder_id`, el campo que decide si se muestra
 * "Abrir File..." o "Crear File...". Sin esto el detalle se queda cacheado con
 * el `null` viejo y el botón no cambia hasta un F5.
 *
 * Hay DOS caminos que crean la carpeta, y ambos deben refrescar ese campo:
 * el botón "Crear File..." y —confirmado con backend 2026-07-31— la propia
 * subida de un documento sobre un registro que aún no tenía carpeta.
 */
function invalidarCarpeta(
  qc: ReturnType<typeof useQueryClient>,
  tipo: TipoEntidadArchivo,
  id: number,
) {
  invalidar(qc, qk.archivos(tipo, id), tipo === 'empresa' ? qk.empresa(id) : qk.oportunidad(id))
}

/** Subida de un documento. Crea la carpeta de paso si aún no existía. */
export function useSubirArchivo(tipo: TipoEntidadArchivo, id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => archivosApi.subir(tipo, id, file),
    onSuccess: () => invalidarCarpeta(qc, tipo, id),
  })
}

/**
 * Crea la carpeta de Drive explícitamente, sin subir ningún archivo.
 * Idempotente en el backend, así que un doble clic no duplica carpetas.
 */
export function useCrearCarpetaDrive(tipo: TipoEntidadArchivo, id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => archivosApi.crearCarpeta(tipo, id),
    onSuccess: () => invalidarCarpeta(qc, tipo, id),
  })
}
