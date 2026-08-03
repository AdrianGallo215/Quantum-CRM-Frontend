import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { Typography } from 'antd'
import { AdminEmpleados } from './AdminEmpleados'
import { AdminFinanciadoras } from './AdminFinanciadoras'
import { AdminModelos } from './AdminModelos'
import { AdminCatalogoEventos } from './AdminCatalogoEventos'
import { AdminImportCsvTemp } from './AdminImportCsvTemp'

const secciones = [
  { to: 'empleados', label: 'Empleados' },
  { to: 'financiadoras', label: 'Financiadoras' },
  { to: 'modelos', label: 'Modelos' },
  { to: 'catalogo-eventos', label: 'Catálogo de eventos' },
  { to: 'import-csv-temp', label: 'Importar CSV (temporal)' },
]

export function AdminPage() {
  return (
    <div className="page-container">
      <Typography.Title level={2} style={{ marginTop: 0 }}>
        Administración
      </Typography.Title>

      {/* Tab switcher según DESIGN.md §9.6 */}
      <div
        style={{
          display: 'inline-flex',
          background: '#ecedff',
          padding: 4,
          borderRadius: 4,
          gap: 2,
          marginBottom: 24,
        }}
      >
        {secciones.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            style={({ isActive }) => ({
              padding: '6px 16px',
              borderRadius: 2,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              color: isActive ? '#244481' : '#444750',
              background: isActive ? '#ffffff' : 'transparent',
              boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.04)' : 'none',
              transition: 'all 0.2s',
            })}
          >
            {s.label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route index element={<Navigate to="empleados" replace />} />
        <Route path="empleados" element={<AdminEmpleados />} />
        <Route path="financiadoras" element={<AdminFinanciadoras />} />
        <Route path="modelos" element={<AdminModelos />} />
        <Route path="catalogo-eventos" element={<AdminCatalogoEventos />} />
        <Route path="import-csv-temp" element={<AdminImportCsvTemp />} />
      </Routes>
    </div>
  )
}
