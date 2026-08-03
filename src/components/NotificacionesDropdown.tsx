import { useState } from 'react'
import { Badge, Button, Dropdown, Empty, Spin } from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  useMarcarNotificacionLeida,
  useMarcarTodasNotificacionesLeidas,
  useNotificaciones,
  useNotificacionesNoLeidasCount,
} from '@/hooks/useNotificaciones'
import { useAuthStore, ROLES_BANDEJA_GERENCIA, tieneRol } from '@/store/authStore'
import { formatoTiempoRelativo } from '@/utils/formato'
import type { EntidadNotificacion, Notificacion } from '@/types'

/**
 * Ruta de detalle por tipo de entidad. Antes se derivaba con `${tipo}s`, que
 * generaba `/oportunidads/:id` — una ruta inexistente que el catch-all del
 * router mandaba a `/`. Es decir: TODA notificación de oportunidad (cambio de
 * estado, evento, tarea, traspaso) terminaba en el inicio.
 * Un mapa explícito hace imposible que vuelva a pasar en silencio.
 */
const RUTA_ENTIDAD: Record<Exclude<EntidadNotificacion, 'solicitud' | 'meta'>, string> = {
  oportunidad: 'oportunidades',
  empresa: 'empresas',
}

export function NotificacionesDropdown() {
  const [abierto, setAbierto] = useState(false)
  const navigate = useNavigate()
  const empleado = useAuthStore((s) => s.empleado)

  const conteo = useNotificacionesNoLeidasCount()
  const notificaciones = useNotificaciones(abierto)
  const marcarLeida = useMarcarNotificacionLeida()
  const marcarTodas = useMarcarTodasNotificacionesLeidas()

  const noLeidas = conteo.data ?? 0

  const irANotificacion = (n: Notificacion) => {
    if (!n.leida) marcarLeida.mutate(n.id)
    setAbierto(false)
    if (n.entidad_tipo === 'solicitud' || n.entidad_tipo === 'meta') {
      // solicitud_creada / meta_propuesta llegan al aprobador; el resto al
      // solicitante/JDV. En ambos casos su vista vive en /gerencia
      // (gerencia/admin) o /solicitudes (jdv, incluye la pestaña Metas).
      navigate(tieneRol(empleado, ROLES_BANDEJA_GERENCIA) ? '/gerencia' : '/solicitudes')
      return
    }
    navigate(`/${RUTA_ENTIDAD[n.entidad_tipo]}/${n.entidad_id}`)
  }

  return (
    <Dropdown
      trigger={['click']}
      open={abierto}
      onOpenChange={setAbierto}
      dropdownRender={() => (
        <div className="w-96 max-h-[28rem] flex flex-col bg-white rounded-lg shadow-lg border border-outline-variant/30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/30">
            <span className="font-bold text-body-md">Notificaciones</span>
            {noLeidas > 0 && (
              <Button
                type="link"
                size="small"
                onClick={() => marcarTodas.mutate()}
                loading={marcarTodas.isPending}
              >
                Marcar todas como leídas
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {notificaciones.isLoading ? (
              <div className="flex justify-center py-8">
                <Spin size="small" />
              </div>
            ) : (notificaciones.data ?? []).length === 0 ? (
              <Empty description="Sin notificaciones" style={{ padding: '32px 0' }} />
            ) : (
              (notificaciones.data ?? []).map((n) => (
                <button
                  key={n.id}
                  onClick={() => irANotificacion(n)}
                  className={`w-full text-left px-4 py-3 border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors ${
                    n.leida ? '' : 'bg-brand-primary/5'
                  }`}
                >
                  <p className="text-body-sm text-on-surface">{n.mensaje}</p>
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    {formatoTiempoRelativo(n.created_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    >
      <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors relative">
        <Badge dot={noLeidas > 0} offset={[-4, 4]}>
          <span className="material-symbols-outlined">notifications</span>
        </Badge>
      </button>
    </Dropdown>
  )
}
