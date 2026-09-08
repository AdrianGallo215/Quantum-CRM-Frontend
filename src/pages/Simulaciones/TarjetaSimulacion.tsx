import { Button, Tag, Tooltip } from 'antd'
import { Link } from 'react-router-dom'
import { RUTA_SIMULACIONES } from '@/router/rutas'
import { formatoMonto, formatoFecha } from '@/utils/formato'
import { formatoTea } from '@/utils/simulaciones'
import type { Simulacion } from '@/types/simulacion'

/**
 * Tarjeta de una simulación en el listado del módulo (T5.1, encargo §5.1).
 * Componente tonto (mismo patrón que `CronogramaTabla`, D23): recibe la
 * `Simulacion` ya resuelta y no pide nada por su cuenta. `onMarcarPrincipal`
 * lo llama la página, que es quien tiene el hook de mutación — así el no-op
 * exitoso (K33: marcar principal una que ya lo es no es error) lo maneja el
 * mismo hook que ya lo modela, sin duplicar esa lógica acá.
 *
 * Campos EXACTOS de `reglas_simulaciones.md` §8.2 / encargo §5.1, EN ESTE
 * ORDEN — no reordenar:
 *   Título: `nombre` (real o autogenerado)
 *   Destacado: `cuota_final`
 *   Secundarios: `tea` · `valor_residual` · `cuota_inicial`
 *   Pie: fecha de última edición (`updated_at`)
 * Más: badge `es_principal` y el aviso de huérfana (D29).
 */
export function TarjetaSimulacion({
  simulacion,
  onMarcarPrincipal,
  marcandoPrincipal = false,
}: {
  simulacion: Simulacion
  onMarcarPrincipal?: (id: number) => void
  marcandoPrincipal?: boolean
}) {
  // Sin ítem, `id_oportunidad_item` es null (reglas §5). Es huérfana.
  const esHuerfana = simulacion.id_oportunidad_item === null

  return (
    <div className="bg-white p-4 rounded border border-outline-variant custom-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`${RUTA_SIMULACIONES}/${simulacion.id}`}
          className="font-headline text-title-md text-on-surface hover:underline"
        >
          {simulacion.nombre}
        </Link>
        <div className="flex flex-col items-end gap-1">
          {simulacion.es_principal && <Tag color="gold">Principal</Tag>}
          {/*
            §8.1: el nombre manual es pegajoso y NO se regenera; el
            autogenerado sí puede cambiar cuando cambian sus componentes. Es
            información legítima para el usuario — no se esconde ni se
            deduce parseando el texto (encargo §8.1 lo prohíbe expresamente).
          */}
          {!simulacion.nombre_es_manual && (
            <Tooltip title="Este nombre se genera automáticamente y puede cambiar">
              <Tag>Autogenerado</Tag>
            </Tooltip>
          )}
        </div>
      </div>

      <div>
        <span className="block text-label-md uppercase tracking-wider text-on-surface-variant">
          Cuota final
        </span>
        <span className="text-headline-sm font-semibold tabular-nums text-on-surface">
          {formatoMonto(simulacion.cuota_final)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Secundario etiqueta="TEA" valor={formatoTea(simulacion.tea)} />
        <Secundario etiqueta="Valor residual" valor={formatoMonto(simulacion.valor_residual)} />
        <Secundario etiqueta="Cuota inicial" valor={formatoMonto(simulacion.cuota_inicial)} />
      </div>

      {/*
        D29 (aviso 2 de 3: la tarjeta del listado). §8.3: la UI NUNCA promete
        que "va a avisar" — el aviso por correo es best-effort (job diario).
        La garantía real, siempre visible, es `eliminacion_prevista_el`.
      */}
      {esHuerfana && simulacion.eliminacion_prevista_el && (
        <Tag color="warning" className="w-fit">
          Sin vincular — se eliminará el {formatoFecha(simulacion.eliminacion_prevista_el)}
        </Tag>
      )}

      <div className="flex items-center justify-between border-t border-outline-variant pt-2">
        <span className="text-label-sm text-on-surface-variant">
          Editado: {formatoFecha(simulacion.updated_at)}
        </span>
        {/*
          §7.5/K33: sin ítem, `es_principal` es siempre `false` y el backend
          responde `400 VALIDACION` si se intenta — no se ofrece el botón en
          una huérfana. Guard de UX, no de seguridad (CLAUDE.md regla 8).
        */}
        {!esHuerfana && onMarcarPrincipal && (
          <Button
            size="small"
            loading={marcandoPrincipal}
            onClick={() => onMarcarPrincipal(simulacion.id)}
          >
            Marcar como principal
          </Button>
        )}
      </div>
    </div>
  )
}

function Secundario({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div role="group" aria-label={etiqueta}>
      <span className="block text-label-sm uppercase tracking-wider text-on-surface-variant">
        {etiqueta}
      </span>
      <span className="text-body-md font-medium tabular-nums text-on-surface">{valor}</span>
    </div>
  )
}
