import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { actividadesApi } from '@/api/actividades'
import type { ActividadesFiltros, CrearComentarioInput, TipoActividad } from '@/types'
import { invalidar, qk } from './queryKeys'

/**
 * Historial unificado de un empleado.
 *
 * `enabled` cubre el requisito duro del informe §3: `id_empleado` es obligatorio.
 * Mientras no haya uno válido la query no se dispara — pedirlo sin él solo
 * produce un 400 que la pantalla no puede resolver.
 *
 * `placeholderData: (anterior) => anterior` mantiene en pantalla la página
 * previa mientras carga la siguiente. Sin eso la tabla parpadea a vacío en cada
 * cambio de página y el salto de scroll es desagradable.
 */
export function useActividades(filtros: ActividadesFiltros) {
  return useQuery({
    queryKey: [...qk.actividades, filtros],
    queryFn: () => actividadesApi.listar(filtros),
    enabled: Number.isFinite(filtros.id_empleado) && filtros.id_empleado > 0,
    placeholderData: (anterior) => anterior,
  })
}

/**
 * Comentarios de una actividad. Sin paginación (informe §4): llegan todos, ya
 * ordenados cronológicamente ASC. NO los reordenes en el cliente.
 *
 * `activo` deja apagar la query mientras la ficha esté cerrada: es lo que evita
 * que abrir una página con 20 modales montados dispare 20 peticiones inútiles.
 */
export function useComentariosActividad(tipo: TipoActividad, id: number, activo = true) {
  return useQuery({
    queryKey: qk.actividadComentarios(tipo, id),
    queryFn: () => actividadesApi.comentarios(tipo, id),
    enabled: activo && Number.isFinite(id) && id > 0,
  })
}

/**
 * Alta de comentario (append-only: no hay editar ni borrar).
 *
 * Invalida el árbol `actividades` ENTERO, no solo la lista de comentarios: el
 * contador `comentarios` de cada fila del historial vive en otra query, y el
 * invariante de `queryKeys.ts` garantiza que la key de comentarios cuelga de
 * `qk.actividades` — una sola invalidación arrastra las dos (CLAUDE.md regla 4).
 */
export function useCrearComentario(tipo: TipoActividad, id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearComentarioInput) => actividadesApi.crearComentario(tipo, id, input),
    onSuccess: () => invalidar(qc, qk.actividades),
  })
}

/**
 * Auditoría de ediciones. Sin paginación (informe §6). Llega del cambio más
 * reciente al más antiguo — ese orden es del backend, NO lo reordenes.
 */
export function useAuditoriaActividad(tipo: TipoActividad, id: number, activo = true) {
  return useQuery({
    queryKey: qk.actividadAuditoria(tipo, id),
    queryFn: () => actividadesApi.auditoria(tipo, id),
    enabled: activo && Number.isFinite(id) && id > 0,
  })
}
