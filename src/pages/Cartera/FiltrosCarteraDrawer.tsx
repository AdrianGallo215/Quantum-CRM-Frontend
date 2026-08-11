import { useEffect, useState } from 'react'
import { Button, Drawer, Form, Select } from 'antd'
import { SEGMENTOS, type EmpleadoResumen, type EstadoCartera, type Segmento } from '@/types'
import { ETIQUETA_SEGMENTO } from '@/utils/etiquetas'
import { nombreCompleto } from '@/utils/formato'

/**
 * Clave del tab de Cartera. Es a la vez el valor del select "Estado de cartera"
 * del panel: tabs y select son el mismo control renderizado dos veces, para que
 * no puedan desincronizarse.
 *
 * - `'todas'`  → sin filtro de estado
 * - `'maestra'`→ no es un estado, es `cartera_maestra=true` (solo gerencia/admin)
 */
export type ClaveEstadoCartera = EstadoCartera | 'todas' | 'maestra'

export interface FiltrosCartera {
  estado: ClaveEstadoCartera
  idVendedor?: number
  segmento?: Segmento
}

interface Props {
  open: boolean
  onClose: () => void
  /** Filtros actualmente aplicados. Inicializa el borrador cada vez que se abre. */
  valor: FiltrosCartera
  /** Se llama solo al pulsar "Aplicar filtros". Cerrar sin aplicar descarta el borrador. */
  onAplicar: (filtros: FiltrosCartera) => void
  /** Misma lista que alimenta los tabs — la pasa el padre para que no puedan divergir. */
  opcionesEstado: { value: ClaveEstadoCartera; label: string }[]
  /** Solo admin/gerencia/jdv. El backend rechaza `id_vendedor` al resto de roles. */
  mostrarVendedor: boolean
  vendedores: EmpleadoResumen[]
  cargandoVendedores: boolean
}

const VACIO: FiltrosCartera = { estado: 'todas' }

/**
 * Panel lateral de filtros de la Cartera.
 *
 * Trabaja sobre un borrador local y solo notifica al padre al pulsar "Aplicar":
 * con aplicación inmediata, componer un filtro de tres campos dispararía tres
 * peticiones y tres parpadeos de la tabla.
 */
export function FiltrosCarteraDrawer({
  open,
  onClose,
  valor,
  onAplicar,
  opcionesEstado,
  mostrarVendedor,
  vendedores,
  cargandoVendedores,
}: Props) {
  const [borrador, setBorrador] = useState<FiltrosCartera>(valor)

  // Cada apertura parte de lo que hay aplicado ahora mismo, no de lo que el
  // usuario dejó a medias la vez anterior y no llegó a aplicar.
  useEffect(() => {
    if (open) setBorrador(valor)
  }, [open, valor])

  // Las empresas de la Cartera Maestra no tienen vendedor asignado (se les
  // desasigna al moverlas), así que filtrar por vendedor ahí siempre daría cero.
  const esMaestra = borrador.estado === 'maestra'

  const aplicar = () => {
    onAplicar(esMaestra ? { ...borrador, idVendedor: undefined } : borrador)
    onClose()
  }

  return (
    <Drawer
      title="Filtrar empresas"
      placement="right"
      open={open}
      onClose={onClose}
      width="min(100vw, 380px)"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={() => setBorrador(VACIO)}>Limpiar</Button>
          <Button type="primary" onClick={aplicar}>
            Aplicar filtros
          </Button>
        </div>
      }
    >
      <Form layout="vertical" requiredMark={false}>
        <Form.Item label="Estado de cartera">
          <Select<ClaveEstadoCartera>
            value={borrador.estado}
            onChange={(estado) => setBorrador((b) => ({ ...b, estado }))}
            options={opcionesEstado}
          />
        </Form.Item>

        {mostrarVendedor && (
          <Form.Item
            label="Vendedor asignado"
            extra={
              esMaestra
                ? 'Las empresas de la Cartera Maestra no tienen vendedor asignado.'
                : undefined
            }
          >
            <Select<number>
              allowClear
              showSearch
              optionFilterProp="label"
              disabled={esMaestra}
              loading={cargandoVendedores}
              placeholder="Todos los vendedores"
              value={borrador.idVendedor}
              onChange={(idVendedor) => setBorrador((b) => ({ ...b, idVendedor }))}
              options={vendedores.map((v) => ({ value: v.id, label: nombreCompleto(v) }))}
            />
          </Form.Item>
        )}

        <Form.Item label="Segmento">
          <Select<Segmento>
            allowClear
            placeholder="Todos los segmentos"
            value={borrador.segmento}
            onChange={(segmento) => setBorrador((b) => ({ ...b, segmento }))}
            options={SEGMENTOS.map((s) => ({ value: s, label: ETIQUETA_SEGMENTO[s] }))}
          />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
