import { useState } from 'react'
import { Alert, App, Button, Skeleton, Tooltip, Upload } from 'antd'
import { useArchivos, useCrearCarpetaDrive, useSubirArchivo } from '@/hooks/useArchivos'
import {
  MAX_TAMANO_ARCHIVO_BYTES,
  errorArchivoDemasiadoGrande,
  iconoDeMime,
  mensajeErrorCarpeta,
  mensajeErrorSubida,
  type ErrorSubida,
} from '@/utils/archivos'
import { formatoTamanoArchivo } from '@/utils/formato'
import { urlSegura } from '@/utils/url'
import { Icono } from '@/components/Icono'
import { ErrorCarga } from '@/components/Estados'
import { useAuthStore, ROLES_APOYO, tieneRol } from '@/store/authStore'
import type { TipoEntidadArchivo } from '@/types'

/**
 * No existe endpoint para "abrir la carpeta": el link se arma en el frontend
 * a partir del drive_folder_id que ya viene en el detalle de la entidad.
 */
const URL_CARPETA_DRIVE = 'https://drive.google.com/drive/folders/'

interface DocumentosDriveProps {
  tipo: TipoEntidadArchivo
  id: number
  /**
   * null → la entidad aún no tiene carpeta en Drive. En ese caso se muestra
   * "Crear {nombreFile}" en lugar de "Abrir {nombreFile}".
   */
  driveFolderId: string | null
  /**
   * Nombre de la carpeta tal como lo ve el usuario: "File del Cliente" /
   * "File de la Oportunidad". El componente antepone el verbo según el estado
   * ("Abrir ..." o "Crear ..."), así que el texto se escribe una sola vez y las
   * dos etiquetas no pueden divergir.
   */
  nombreFile: string
}

export function DocumentosDrive({ tipo, id, driveFolderId, nombreFile }: DocumentosDriveProps) {
  const { message } = App.useApp()
  const archivos = useArchivos(tipo, id)
  const subir = useSubirArchivo(tipo, id)
  const crearCarpeta = useCrearCarpetaDrive(tipo, id)
  const empleado = useAuthStore((s) => s.empleado)
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)

  const [errorSubida, setErrorSubida] = useState<ErrorSubida | null>(null)
  const [errorCarpeta, setErrorCarpeta] = useState<ErrorSubida | null>(null)
  /** Se guarda para poder reintentar la misma subida sin volver a elegir el archivo */
  const [ultimoArchivo, setUltimoArchivo] = useState<File | null>(null)

  const enviar = async (file: File) => {
    setErrorSubida(null)
    setUltimoArchivo(file)

    // Validación en cliente antes de gastar una subida larga que terminaría en 413.
    if (file.size > MAX_TAMANO_ARCHIVO_BYTES) {
      setErrorSubida(errorArchivoDemasiadoGrande())
      return
    }

    try {
      await subir.mutateAsync(file)
      message.success('Documento subido')
      setUltimoArchivo(null)
    } catch (e) {
      setErrorSubida(mensajeErrorSubida(e))
    }
  }

  const abrirCarpeta = () => {
    if (!driveFolderId) return
    window.open(`${URL_CARPETA_DRIVE}${driveFolderId}`, '_blank', 'noopener,noreferrer')
  }

  /**
   * El backend es idempotente y tiene lock propio, así que un doble clic no
   * duplica carpetas. Deshabilitar el botón mientras corre es solo UX.
   * Al terminar, la invalidación del hook refresca el detalle de la entidad →
   * llega el nuevo `driveFolderId` por props → el botón cambia solo.
   */
  const onCrearCarpeta = async () => {
    setErrorCarpeta(null)
    try {
      await crearCarpeta.mutateAsync()
      message.success('Carpeta creada en Drive')
    } catch (e) {
      setErrorCarpeta(mensajeErrorCarpeta(e))
    }
  }

  const lista = archivos.data ?? []

  return (
    <section className="bg-white p-container-padding rounded custom-shadow border border-outline-variant">
      <div className="flex items-center gap-2 mb-6 text-primary">
        <Icono nombre="folder_shared" />
        <h3 className="font-headline-sm text-headline-sm">Documentos</h3>
      </div>

      {/* Botón primario. Sin carpeta se ofrece crearla; con carpeta, abrirla.
          Nunca los dos a la vez: "Crear ..." desaparece por completo en cuanto
          existe la carpeta, y un botón "Abrir ..." muerto no aportaría nada
          cuando la acción disponible es crearla. */}
      {driveFolderId ? (
        <Button
          type="primary"
          block
          onClick={abrirCarpeta}
          icon={<Icono nombre="drive_folder_upload" tamano={18} />}
        >
          Abrir {nombreFile}
        </Button>
      ) : (
        <Tooltip
          title={
            esRolDeApoyo
              ? 'Tu rol es de solo lectura: no puedes crear la carpeta de Drive'
              : 'Aún no existe la carpeta en Drive. Créala para empezar a guardar documentos.'
          }
        >
          <span className="block">
            <Button
              type="primary"
              block
              loading={crearCarpeta.isPending}
              disabled={crearCarpeta.isPending || esRolDeApoyo}
              onClick={() => void onCrearCarpeta()}
              icon={<Icono nombre="create_new_folder" tamano={18} />}
            >
              {crearCarpeta.isPending ? 'Creando…' : `Crear ${nombreFile}`}
            </Button>
          </span>
        </Tooltip>
      )}

      {errorCarpeta && (
        <Alert
          type="error"
          showIcon
          message={errorCarpeta.mensaje}
          action={
            errorCarpeta.reintentable ? (
              <Button size="small" onClick={() => void onCrearCarpeta()}>
                Reintentar
              </Button>
            ) : undefined
          }
          style={{ marginTop: 12, borderRadius: 4 }}
        />
      )}

      {/* Listado */}
      <div className="mt-6">
        {archivos.isLoading ? (
          <Skeleton active title={false} paragraph={{ rows: 3 }} />
        ) : archivos.isError ? (
          <ErrorCarga error={archivos.error} onReintentar={() => void archivos.refetch()} />
        ) : lista.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No hay documentos todavía</p>
        ) : (
          <ul className="flex flex-col">
            {lista.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 py-3 border-b border-outline-variant/30 last:border-b-0"
              >
                <Icono
                  nombre={iconoDeMime(a.mime_type)}
                  tamano={22}
                  className="text-on-surface-variant shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <Tooltip title={a.nombre}>
                    {urlSegura(a.url) ? (
                      <a
                        className="block truncate text-body-md font-semibold text-primary hover:underline"
                        href={urlSegura(a.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {a.nombre}
                      </a>
                    ) : (
                      // url ausente o con esquema no confiable → no clicable
                      <span className="block truncate text-body-md font-semibold text-on-surface">
                        {a.nombre}
                      </span>
                    )}
                  </Tooltip>
                  <p className="text-label-md text-on-surface-variant">
                    {formatoTamanoArchivo(a.tamano_bytes)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Control de subida */}
      <div className="mt-6 pt-4 border-t border-outline-variant/30">
        {/* Dragger: cubre las dos vías de entrada —soltar y hacer clic— con un
            solo `beforeUpload`, así que ambas pasan por `enviar` y comparten su
            validación de tamaño y su manejo de errores. AntD ya aporta el estado
            visual al arrastrar por encima. Con `multiple` en false (su valor por
            defecto) rc-upload se queda solo con el primer archivo soltado. */}
        <Upload.Dragger
          maxCount={1}
          showUploadList={false}
          disabled={subir.isPending || esRolDeApoyo}
          // return false → AntD no sube nada por su cuenta; la subida la hace el hook.
          beforeUpload={(file) => {
            void enviar(file)
            return false
          }}
        >
          <p className="flex justify-center mb-2 text-primary">
            <Icono nombre={subir.isPending ? 'progress_activity' : 'upload_file'} tamano={28} />
          </p>
          <p className="text-body-md font-semibold text-on-surface">
            {subir.isPending ? 'Subiendo…' : 'Arrastra un documento o haz clic para seleccionarlo'}
          </p>
          {!subir.isPending && (
            <p className="text-label-md text-on-surface-variant">Un archivo a la vez</p>
          )}
        </Upload.Dragger>

        {errorSubida && (
          <Alert
            type="error"
            showIcon
            message={errorSubida.mensaje}
            action={
              errorSubida.reintentable && ultimoArchivo ? (
                <Button size="small" onClick={() => void enviar(ultimoArchivo)}>
                  Reintentar
                </Button>
              ) : undefined
            }
            style={{ marginTop: 12, borderRadius: 4 }}
          />
        )}
      </div>
    </section>
  )
}
