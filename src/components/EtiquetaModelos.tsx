import { Tooltip } from 'antd'
import type { OportunidadItem } from '@/types'
import { etiquetaModelos } from '@/utils/oportunidades'

/**
 * Etiqueta de modelo(s) de una oportunidad, con tooltip que lista todos los
 * códigos cuando hay más de un ítem (D3). Antes el Tooltip condicional estaba
 * copiado en `TablaOportunidades` y `EmpresaDetallePage`, y faltaba por
 * completo en la cabecera del detalle de oportunidad — con dos modelos el
 * usuario veía "K12 +1" sin forma de saber cuál era el otro, en la pantalla
 * donde más lo necesitaba (hallazgo B9 de la auditoría de T7.1).
 */
export function EtiquetaModelos({ items }: { items: readonly OportunidadItem[] }) {
  if (items.length <= 1) return <>{etiquetaModelos(items)}</>
  return (
    <Tooltip title={items.map((it) => it.modelo.codigo).join(', ')}>
      {etiquetaModelos(items)}
    </Tooltip>
  )
}
