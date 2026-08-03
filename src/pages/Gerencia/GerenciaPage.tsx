import { Tabs, Typography } from 'antd'
import { BandejaSolicitudes } from '@/components/BandejaSolicitudes'
import { BandejaMetasVenta } from '@/components/BandejaMetasVenta'

/** Vista Gerencia (contrato §5): bandeja de solicitudes y metas de venta con historial. */
export function GerenciaPage() {
  return (
    <div className="page-container">
      <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 4 }}>
        Gerencia
      </Typography.Title>
      <span style={{ color: '#444750' }}>
        Solicitudes de aprobación y metas de venta dirigidas a Gerencia
      </span>
      <div style={{ marginTop: 16 }}>
        <Tabs
          items={[
            { key: 'solicitudes', label: 'Solicitudes', children: <BandejaSolicitudes /> },
            { key: 'metas', label: 'Metas de venta', children: <BandejaMetasVenta /> },
          ]}
        />
      </div>
    </div>
  )
}
