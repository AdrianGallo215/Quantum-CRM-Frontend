import { useState } from 'react'
import { Input, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { useContactos } from '@/hooks/useContactos'
import type { ContactoListItem } from '@/types'
import { resumenEmpresas } from '@/utils/contactos'
import { nombreCompleto } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'

export function ContactosPage() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)

  // Buscar reinicia la página: la página 5 de un resultado de 3 sale vacía.
  const cambiarBusqueda = (q: string) => {
    setBusqueda(q)
    setPagina(1)
  }

  const contactos = useContactos({ q: busqueda.trim() || undefined, page: pagina })

  const columnas: ColumnsType<ContactoListItem> = [
    {
      title: 'Contacto',
      key: 'contacto',
      render: (_, c) => (
        <div>
          <div style={{ fontWeight: 600 }}>{nombreCompleto(c)}</div>
          <div className="metric-value" style={{ fontSize: 12, color: '#747781' }}>
            {c.email_1 ?? c.tlf_1 ?? '—'}
          </div>
        </div>
      ),
    },
    {
      title: 'Empresa',
      key: 'empresa',
      render: (_, c) => resumenEmpresas(c.empresas),
    },
    {
      title: 'Oportunidades',
      dataIndex: 'oportunidades_count',
      align: 'center',
      render: (n: number) => <span className="metric-value">{n}</span>,
    },
  ]

  return (
    <div className="page-container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 4 }}>
            Contactos
          </Typography.Title>
          <span style={{ color: '#444750' }}>Todos los contactos registrados</span>
        </div>
        <Input.Search
          placeholder="Buscar por nombre o teléfono"
          allowClear
          style={{ width: 300 }}
          onSearch={cambiarBusqueda}
          onChange={(e) => {
            if (e.target.value === '') cambiarBusqueda('')
          }}
        />
      </div>

      {contactos.isLoading ? (
        <Cargando />
      ) : contactos.isError ? (
        <ErrorCarga error={contactos.error} onReintentar={() => void contactos.refetch()} />
      ) : (
        <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
          <Table
            rowKey="id"
            dataSource={contactos.data?.data ?? []}
            columns={columnas}
            size="middle"
            onRow={(c) => ({
              onClick: () => navigate(`/contactos/${c.id}`),
              style: { cursor: 'pointer' },
            })}
            /* Paginación del servidor: sin `current`/`onChange`, AntD paginaba
               en cliente sobre una sola página y la 2ª salía vacía. */
            pagination={{
              current: pagina,
              total: contactos.data?.meta?.total ?? 0,
              pageSize: contactos.data?.meta?.per_page ?? 20,
              showSizeChanger: false,
              onChange: setPagina,
              showTotal: (total) => `${total} contacto${total === 1 ? '' : 's'}`,
            }}
          />
        </div>
      )}
    </div>
  )
}
