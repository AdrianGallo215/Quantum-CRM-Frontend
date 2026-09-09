import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Pagination, Result, Table, Tag } from 'antd'
import type { TableProps } from 'antd'
import type { Dayjs } from 'dayjs'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { estadoHttpDeError } from '@/api/client'
import { ROLES_SUPERVISION, tieneRol, useAuthStore } from '@/store/authStore'
import { useEmpleados } from '@/hooks/useCatalogos'
import { useActividades } from '@/hooks/useActividades'
import type { Actividad, ActividadesFiltros, TipoActividad } from '@/types'
import {
  ETIQUETA_TIPO_ACTIVIDAD,
  ICONO_TIPO_ACTIVIDAD,
  fechaDisplayActividad,
} from '@/utils/actividades'
import { formatoFechaHora, nombreCompleto } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { Icono } from '@/components/Icono'
import { ActividadDetalleModal } from '@/components/actividades/ActividadDetalleModal'
import { FiltrosHistorial } from './FiltrosHistorial'

type ColumnsType<T> = NonNullable<TableProps<T>['columns']>

const POR_PAGINA = 20

/** Lee un query param numérico. Devuelve undefined si falta o no es un número > 0. */
function numeroDeParam(valor: string | null): number | undefined {
  if (valor === null) return undefined
  const n = Number(valor)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * Historial unificado de actividades de un empleado (informe §3).
 *
 * Es una vista pensada para supervisores, pero cualquier rol puede ver el suyo:
 * por eso la ruta va bajo `RequireAuth` sin `RequireRol` (D2) y lo que se
 * restringe por rol es el selector de empleado (D4).
 */
export function HistorialActividadesPage() {
  const navigate = useNavigate()
  const empleadoActual = useAuthStore((s) => s.empleado)
  const esSupervisor = tieneRol(empleadoActual, ROLES_SUPERVISION)

  const [searchParams, setSearchParams] = useSearchParams()
  // `id_empresa` e `id_oportunidad` viven en la URL, no en el estado local (D7):
  // así el enlace "ver el historial de esta empresa" funciona sin selector propio.
  const idEmpresa = numeroDeParam(searchParams.get('id_empresa'))
  const idOportunidad = numeroDeParam(searchParams.get('id_oportunidad'))

  const [idEmpleado, setIdEmpleado] = useState(empleadoActual?.id ?? 0)
  const [rango, setRango] = useState<[Dayjs, Dayjs] | null>(null)
  const [tipo, setTipo] = useState<TipoActividad | undefined>(undefined)
  const [pagina, setPagina] = useState(1)
  const [seleccionada, setSeleccionada] = useState<Actividad | null>(null)

  // El empleado del store llega asíncrono (RequireAuth ya esperó, pero el estado
  // inicial de useState se calcula una sola vez). Sin esto, un refresco directo
  // sobre esta URL deja `idEmpleado` en 0 y la query nunca se habilita.
  useEffect(() => {
    if (empleadoActual && idEmpleado === 0) setIdEmpleado(empleadoActual.id)
  }, [empleadoActual, idEmpleado])

  // Cualquier cambio de filtro vuelve a la página 1: quedarse en la 3 de un
  // conjunto que ahora tiene una sola página muestra una tabla vacía sin motivo.
  useEffect(() => {
    setPagina(1)
  }, [idEmpleado, tipo, rango, idEmpresa, idOportunidad])

  // Solo los supervisores necesitan la lista de empleados. `useEmpleados` con
  // `enabled=false` para el resto evita una petición que además puede dar 403.
  //
  // ⚠ NO uses `useEmpleadosSeleccionables()` aquí (D5): implementa otra regla
  // (contrato §12) y dejaría a un empleado con rol `otro` pidiendo historiales
  // ajenos.
  const empleados = useEmpleados({ activo: true }, esSupervisor)

  const filtros: ActividadesFiltros = useMemo(
    () => ({
      id_empleado: idEmpleado,
      page: pagina,
      per_page: POR_PAGINA,
      ...(tipo ? { tipo } : {}),
      // `desde`/`hasta` son Instants y filtran por `created_at` (informe §3).
      ...(rango
        ? {
            desde: rango[0].startOf('day').toISOString(),
            hasta: rango[1].endOf('day').toISOString(),
          }
        : {}),
      ...(idEmpresa ? { id_empresa: idEmpresa } : {}),
      ...(idOportunidad ? { id_oportunidad: idOportunidad } : {}),
    }),
    [idEmpleado, pagina, tipo, rango, idEmpresa, idOportunidad],
  )

  const actividades = useActividades(filtros)
  const filas = actividades.data?.data ?? []
  const total = actividades.data?.meta?.total ?? filas.length
  const porPagina = actividades.data?.meta?.per_page ?? POR_PAGINA

  const quitarParam = (clave: 'id_empresa' | 'id_oportunidad') => {
    const siguientes = new URLSearchParams(searchParams)
    siguientes.delete(clave)
    setSearchParams(siguientes, { replace: true })
  }

  const columnas: ColumnsType<Actividad> = [
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      width: 110,
      render: (_valor, fila) => (
        <span className="inline-flex items-center gap-1.5">
          <Icono nombre={ICONO_TIPO_ACTIVIDAD[fila.tipo]} tamano={18} />
          {ETIQUETA_TIPO_ACTIVIDAD[fila.tipo]}
        </span>
      ),
    },
    { title: 'Título', dataIndex: 'titulo' },
    {
      title: 'Empresa',
      key: 'empresa',
      render: (_valor, fila) => fila.empresa?.razon_social ?? '—',
    },
    {
      title: 'Responsable',
      key: 'empleado',
      // `empleado` puede llegar null si el backend no pudo resolverlo (informe §3).
      render: (_valor, fila) => nombreCompleto(fila.empleado),
    },
    {
      title: 'Fecha',
      key: 'fecha',
      // Un solo texto derivado de fecha_hora O fecha_dia. Los dos campos NO se
      // mezclan en un Date (informe §3, WARNING).
      render: (_valor, fila) => fechaDisplayActividad(fila),
    },
    { title: 'Estado', dataIndex: 'estado', width: 130 },
    {
      title: 'Creada',
      key: 'created_at',
      render: (_valor, fila) => formatoFechaHora(fila.created_at),
    },
    {
      title: 'Coment.',
      key: 'comentarios',
      width: 90,
      align: 'center',
      render: (_valor, fila) => <Badge count={fila.comentarios} showZero={false} />,
    },
  ]

  if (actividades.isError && estadoHttpDeError(actividades.error) === 403) {
    return (
      <div className="page-container">
        <Result
          status="403"
          title="Sin acceso"
          subTitle="Solo administración, gerencia y jefatura de ventas pueden ver el historial de otro empleado."
          extra={
            <Button type="primary" onClick={() => navigate('/actividades')}>
              Volver a actividades
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Historial de actividades
          </h1>
          <p className="text-text-muted">
            Tareas y eventos registrados, con sus comentarios de seguimiento y sus ediciones.
          </p>
        </div>
        <Button onClick={() => navigate('/actividades')}>Volver a actividades</Button>
      </div>

      <FiltrosHistorial
        esSupervisor={esSupervisor}
        empleados={empleados.data ?? []}
        cargandoEmpleados={empleados.isLoading}
        errorEmpleados={empleados.isError}
        idEmpleado={idEmpleado}
        onIdEmpleado={setIdEmpleado}
        rango={rango}
        onRango={setRango}
        tipo={tipo}
        onTipo={setTipo}
      />

      {(idEmpresa || idOportunidad) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {idEmpresa && (
            <Tag closable onClose={() => quitarParam('id_empresa')}>
              Empresa #{idEmpresa}
            </Tag>
          )}
          {idOportunidad && (
            <Tag closable onClose={() => quitarParam('id_oportunidad')}>
              Oportunidad #{idOportunidad}
            </Tag>
          )}
        </div>
      )}

      {actividades.isLoading && <Cargando />}
      {actividades.isError && (
        <ErrorCarga error={actividades.error} onReintentar={() => void actividades.refetch()} />
      )}

      {!actividades.isLoading && !actividades.isError && (
        <>
          <Table<Actividad>
            // ⚠ `${tipo}-${id}` y NUNCA `id` (D10): la tarea 42 y el evento 42
            // conviven en la misma página y con `id` React descarta una fila.
            rowKey={(fila) => `${fila.tipo}-${fila.id}`}
            columns={columnas}
            dataSource={filas}
            pagination={false}
            scroll={{ x: 1050 }}
            locale={{ emptyText: 'Sin actividades para estos filtros' }}
            onRow={(fila) => ({
              onClick: () => setSeleccionada(fila),
              style: { cursor: 'pointer' },
            })}
          />
          <div className="flex justify-end mt-4">
            <Pagination
              size="small"
              current={pagina}
              total={total}
              pageSize={porPagina}
              showSizeChanger={false}
              onChange={setPagina}
            />
          </div>
        </>
      )}

      <ActividadDetalleModal
        actividad={seleccionada}
        onClose={() => setSeleccionada(null)}
        irADetalle={
          seleccionada
            ? () => {
                const a = seleccionada
                setSeleccionada(null)
                if (a.id_oportunidad) navigate(`/oportunidades/${a.id_oportunidad}`)
                else if (a.id_empresa) navigate(`/empresas/${a.id_empresa}`)
              }
            : undefined
        }
      />
    </div>
  )
}
