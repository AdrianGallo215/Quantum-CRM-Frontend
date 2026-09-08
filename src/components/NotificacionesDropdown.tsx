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
import type { Notificacion } from '@/types'

/**
 * Ruta de detalle por tipo de entidad, o `null` si no hay una todavía.
 *
 * Antes era un `Record<Exclude<EntidadNotificacion, 'solicitud'|'meta_venta'>, string>`
 * que no cubría todo el enum: cuando el backend agregó `entidad_tipo: 'simulacion'`
 * (contrato §26, changelog 2026-09-07) sin que nadie tocara este archivo, el
 * indexado sobre una clave ausente producía `navigate('/undefined/<id>')` —
 * exactamente el patrón de bug K8 que `rutaDeSolicitud`
 * (`src/utils/solicitudes.ts`) corrigió en las solicitudes; acá quedó vivo
 * hasta que la auditoría de T7.1 lo encontró (hallazgo B3). El switch
 * exhaustivo sin `default` es la misma cura: si el backend agrega un valor
 * nuevo, `tsc` lo señala acá en vez de fallar en producción.
 *
 * `solicitud` y `meta_venta` devuelven `null` a propósito: su destino depende
 * del rol (gerencia vs jdv) y se resuelve aparte en `irANotificacion`.
 *
 * `simulacion` navega a `/simulaciones/:id` (Plan 05, T2.2, D31): la ruta ya
 * existe — aunque hoy monte el placeholder `EnConstruccionPage` hasta que
 * T5.1 entregue `SimulacionDetallePage` — y está protegida por `RequireRol`
 * con los mismos roles de `puedeVerModuloSimulaciones`, así que a quien no
 * puede entrar el guard lo manda a `SinAcceso`, no a un 404 del router.
 */
function rutaDeNotificacion(n: Notificacion): string | null {
  switch (n.entidad_tipo) {
    case 'oportunidad':
      return `/oportunidades/${n.entidad_id}`
    case 'empresa':
      return `/empresas/${n.entidad_id}`
    case 'solicitud':
    case 'meta_venta':
      return null
    case 'simulacion':
      return `/simulaciones/${n.entidad_id}`
  }
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
    if (n.entidad_tipo === 'solicitud' || n.entidad_tipo === 'meta_venta') {
      // solicitud_creada / meta_propuesta llegan al aprobador; el resto al
      // solicitante/JDV. En ambos casos su vista vive en /gerencia
      // (gerencia/admin) o /solicitudes (jdv, incluye la pestaña Metas).
      navigate(tieneRol(empleado, ROLES_BANDEJA_GERENCIA) ? '/gerencia' : '/solicitudes')
      return
    }
    const ruta = rutaDeNotificacion(n)
    if (ruta) navigate(ruta)
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
