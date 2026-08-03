import { useState } from 'react'
import { App, Form, Input, Modal, Popconfirm, Select } from 'antd'
import {
  useDesvincularContactoOportunidad,
  useVincularContactoOportunidad,
} from '@/hooks/useOportunidades'
import { useEmpresa } from '@/hooks/useEmpresas'
import { mensajeDeError } from '@/api/client'
import type { ContactoEnOportunidad, OportunidadDetalle } from '@/types'

/** Tarjeta "Contactos Relacionados" del prototipo detalle_de_oportunidad_simplificado */
export function ContactosCard({ oportunidad: o }: { oportunidad: OportunidadDetalle }) {
  const { message } = App.useApp()
  const [modalVincular, setModalVincular] = useState(false)
  const [contactoActivo, setContactoActivo] = useState<ContactoEnOportunidad | null>(null)
  const [form] = Form.useForm<{ id_contacto: number; rol_en_oportunidad: string }>()

  const empresa = useEmpresa(o.id_empresa)
  const vincular = useVincularContactoOportunidad(o.id)
  const desvincular = useDesvincularContactoOportunidad(o.id)

  const yaVinculados = new Set(o.contactos.map((c) => c.id))
  const contactosEmpresa = empresa.data?.contactos ?? []
  const disponibles = contactosEmpresa.filter((c) => !yaVinculados.has(c.id))

  const datosDe = (id: number) => contactosEmpresa.find((c) => c.id === id)

  const onVincular = async () => {
    const v = await form.validateFields()
    try {
      await vincular.mutateAsync(v)
      message.success('Contacto vinculado a la oportunidad')
      form.resetFields()
      setModalVincular(false)
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo vincular el contacto'))
    }
  }

  return (
    <div className="bg-white p-container-padding rounded border border-outline-variant custom-shadow">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-headline text-headline-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">group</span>
          Contactos Relacionados
        </h2>
        <button
          className="p-2 hover:bg-primary/10 rounded-full text-primary transition-colors"
          onClick={() => setModalVincular(true)}
        >
          <span className="material-symbols-outlined">person_add</span>
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {o.contactos.length === 0 && (
          <p className="text-body-md text-on-surface-variant">Sin contactos vinculados</p>
        )}
        {o.contactos.map((c) => {
          const datos = datosDe(c.id)
          return (
            <div
              key={c.id}
              className="p-4 border border-outline-variant rounded hover:border-primary transition-all group cursor-pointer"
              onClick={() => setContactoActivo(c)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-body-lg text-on-surface group-hover:text-primary transition-colors">
                    {c.nombres} {c.apellidos}
                  </h4>
                  <p className="text-body-md text-on-surface-variant">
                    {datos?.cargo ?? c.rol_en_oportunidad ?? '—'}
                  </p>
                </div>
                {c.rol_en_oportunidad && (
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {c.rol_en_oportunidad}
                  </span>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <a
                  className={`flex-1 py-2 bg-surface-container rounded-full text-primary hover:bg-primary hover:text-white transition-all flex justify-center items-center ${datos?.tlf_1 ? '' : 'opacity-40 pointer-events-none'}`}
                  href={datos?.tlf_1 ? `tel:${datos.tlf_1}` : undefined}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="material-symbols-outlined text-[20px]">call</span>
                </a>
                <a
                  className={`flex-1 py-2 bg-surface-container rounded-full text-primary hover:bg-primary hover:text-white transition-all flex justify-center items-center ${datos?.email_1 ? '' : 'opacity-40 pointer-events-none'}`}
                  href={datos?.email_1 ? `mailto:${datos.email_1}` : undefined}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                </a>
                <Popconfirm
                  title="¿Desvincular contacto de la oportunidad?"
                  okText="Desvincular"
                  cancelText="Cancelar"
                  onConfirm={() =>
                    desvincular.mutate(c.id, {
                      onSuccess: () => message.success('Contacto desvinculado'),
                      onError: (e) => message.error(mensajeDeError(e)),
                    })
                  }
                >
                  <button
                    className="flex-1 py-2 bg-surface-container rounded-full text-error hover:bg-error hover:text-white transition-all flex justify-center items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="material-symbols-outlined text-[20px]">link_off</span>
                  </button>
                </Popconfirm>
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        title="Vincular contacto"
        open={modalVincular}
        onCancel={() => setModalVincular(false)}
        onOk={() => void onVincular()}
        okText="Vincular"
        cancelText="Cancelar"
        confirmLoading={vincular.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            name="id_contacto"
            label="Contacto de la empresa"
            rules={[{ required: true, message: 'Requerido' }]}
          >
            <Select
              loading={empresa.isLoading}
              options={disponibles.map((c) => ({
                value: c.id,
                label: `${c.nombres} ${c.apellidos}${c.cargo ? ` — ${c.cargo}` : ''}`,
              }))}
              notFoundContent="Todos los contactos de la empresa ya están vinculados"
            />
          </Form.Item>
          <Form.Item
            name="rol_en_oportunidad"
            label="Rol en la oportunidad"
            rules={[{ required: true, message: 'Requerido' }]}
          >
            <Input placeholder="Contacto Principal" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Datos del contacto"
        open={!!contactoActivo}
        onCancel={() => setContactoActivo(null)}
        footer={null}
        destroyOnHidden
      >
        {contactoActivo &&
          (() => {
            const datos = datosDe(contactoActivo.id)
            return (
              <div className="flex flex-col gap-3">
                <h4 className="font-bold text-body-lg text-on-surface">
                  {contactoActivo.nombres} {contactoActivo.apellidos}
                </h4>
                <p className="text-body-md text-on-surface-variant">{datos?.cargo ?? '—'}</p>
                <div className="flex flex-wrap gap-2">
                  {contactoActivo.rol_en_oportunidad && (
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {contactoActivo.rol_en_oportunidad}
                    </span>
                  )}
                  {datos?.es_principal && (
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Contacto principal
                    </span>
                  )}
                  {datos?.toma_decision && (
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Toma decisión
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 mt-2">
                  <a
                    className={`text-primary flex items-center gap-2 ${datos?.tlf_1 ? '' : 'opacity-40 pointer-events-none'}`}
                    href={datos?.tlf_1 ? `tel:${datos.tlf_1}` : undefined}
                  >
                    <span className="material-symbols-outlined text-[20px]">call</span>
                    {datos?.tlf_1 ?? 'Sin teléfono'}
                  </a>
                  <a
                    className={`text-primary flex items-center gap-2 ${datos?.email_1 ? '' : 'opacity-40 pointer-events-none'}`}
                    href={datos?.email_1 ? `mailto:${datos.email_1}` : undefined}
                  >
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                    {datos?.email_1 ?? 'Sin email'}
                  </a>
                </div>
              </div>
            )
          })()}
      </Modal>
    </div>
  )
}
