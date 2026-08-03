import { useState } from 'react'
import { Alert, Button, Table, Typography, Upload } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd'
import { useImportarEmpresasCsv } from '@/hooks/useImportCsvTemp'
import { mensajeDeError } from '@/api/client'
import type { ImportCsvFilaResultado, ImportCsvResultado } from '@/types'
import { PositivoTag, UrgenteTag } from '@/components/EstadoTag'
import { Icono } from '@/components/Icono'

const columnas: ColumnsType<ImportCsvFilaResultado> = [
  { title: 'Fila', dataIndex: 'fila', width: 80 },
  { title: 'RUC', dataIndex: 'ruc' },
  { title: 'Razón social', dataIndex: 'razon_social' },
  {
    title: 'Estado',
    dataIndex: 'estado',
    render: (estado: ImportCsvFilaResultado['estado']) =>
      estado === 'creada' ? <PositivoTag>Creada</PositivoTag> : <UrgenteTag>Error</UrgenteTag>,
  },
  {
    title: 'Motivo',
    dataIndex: 'motivo',
    render: (motivo: string | null) =>
      motivo ? <span style={{ color: '#93000a' }}>{motivo}</span> : '—',
  },
]

export function AdminImportCsvTemp() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [resultado, setResultado] = useState<ImportCsvResultado | null>(null)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const importar = useImportarEmpresasCsv()

  const seleccionarArchivo = (file: File) => {
    setArchivo(file)
    setResultado(null)
    setErrorArchivo(null)
    return false
  }

  const quitarArchivo = () => {
    setArchivo(null)
    setResultado(null)
    setErrorArchivo(null)
  }

  const onImportar = async () => {
    if (!archivo) return
    setErrorArchivo(null)
    try {
      const data = await importar.mutateAsync(archivo)
      setResultado(data)
    } catch (e) {
      setResultado(null)
      setErrorArchivo(mensajeDeError(e, 'No se pudo importar el archivo'))
    }
  }

  return (
    <div className="bento-card">
      <span className="eyebrow">Herramienta temporal</span>
      <Typography.Paragraph type="secondary" style={{ marginTop: 4 }}>
        Importación temporal — solo empresas, columnas RUC/Razón Social/Segmento.
      </Typography.Paragraph>

      <Upload
        accept=".csv"
        maxCount={1}
        fileList={
          archivo
            ? [{ uid: 'archivo-csv', name: archivo.name, status: 'done' } as UploadFile]
            : []
        }
        beforeUpload={seleccionarArchivo}
        onRemove={quitarArchivo}
      >
        <Button icon={<Icono nombre="upload_file" tamano={18} />}>Seleccionar CSV</Button>
      </Upload>

      <Button
        type="primary"
        style={{ marginTop: 16, display: 'block' }}
        disabled={!archivo}
        loading={importar.isPending}
        onClick={() => void onImportar()}
      >
        Importar
      </Button>

      {errorArchivo && (
        <Alert
          type="error"
          showIcon
          message="No se pudo importar el archivo"
          description={errorArchivo}
          style={{ marginTop: 24, borderRadius: 4 }}
        />
      )}

      {resultado && (
        <div style={{ marginTop: 24 }}>
          <Typography.Text strong>
            {resultado.creadas} de {resultado.total_filas} filas creadas
            {resultado.con_error > 0 ? ` — ${resultado.con_error} con error` : ''}
          </Typography.Text>
          <Table
            style={{ marginTop: 12 }}
            rowKey="fila"
            dataSource={resultado.detalle}
            columns={columnas}
            pagination={false}
            size="middle"
            scroll={{ x: 'max-content' }}
          />
        </div>
      )}
    </div>
  )
}
