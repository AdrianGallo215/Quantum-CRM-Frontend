import { useState } from 'react'
import { App, Button, Card, Col, Divider, Modal, Row, Select, Space, Typography } from 'antd'
import { FormularioParametros } from '@/components/simulaciones/FormularioParametros'
import { CronogramaTabla } from '@/components/simulaciones/CronogramaTabla'
import { mensajeDeError } from '@/api/client'
import { useCalculadora } from '@/hooks/useCalculadora'
import { useEmpresas } from '@/hooks/useEmpresas'
import { useModelos } from '@/hooks/useCatalogos'
import { useOportunidades } from '@/hooks/useOportunidades'
import { useCrearSimulacion } from '@/hooks/useSimulaciones'
import { formatoMonto } from '@/utils/formato'
import type { Oportunidad } from '@/types/oportunidad'
import type { CalculadoraInput, CalculadoraResultado } from '@/types/calculadora'
import type { CrearSimulacionInput } from '@/types/simulacion'

/**
 * T3.1 (`plan-05-vistas-simulaciones-tareas.md`), encargo §5.3. Layout de dos
 * columnas (H0 aprobado): formulario a la izquierda, resultado a la derecha.
 *
 * Cálculo efímero (reglas §9): esta página NUNCA llama a `POST /simulaciones`
 * por su cuenta al calcular — solo `POST /calculadora`, vía `useCalculadora`.
 * La única vía de persistencia es el botón "Enlazar a Oportunidad", que es
 * literalmente `POST /simulaciones` con los mismos parámetros más el
 * `id_oportunidad_item` elegido (§24).
 */
export function CalculadoraPage() {
  const [idEmpresa, setIdEmpresa] = useState<number | null>(null)
  const [idModelo, setIdModelo] = useState<number | null>(null)
  const [resultado, setResultado] = useState<CalculadoraResultado | null>(null)
  const [ultimosValores, setUltimosValores] = useState<CrearSimulacionInput | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  const calculadora = useCalculadora()
  const empresas = useEmpresas()
  const modelos = useModelos()

  const handleCalcular = async (valores: CrearSimulacionInput) => {
    // §5.3: id_empresa/id_modelo son puramente de presentación. NO participan
    // del cálculo — el backend los devuelve resueltos solo para mostrarlos en
    // la propuesta.
    const input: CalculadoraInput = {
      modo: valores.modo,
      precio_venta: valores.precio_venta,
      cuota_inicial: valores.cuota_inicial,
      plazo_meses: valores.plazo_meses,
      tea: valores.tea,
      descuento: valores.descuento,
      valor_residual: valores.valor_residual,
      dias_trabajados: valores.dias_trabajados,
      comision_estructuracion: valores.comision_estructuracion,
      id_empresa: idEmpresa,
      id_modelo: idModelo,
    }
    const data = await calculadora.mutateAsync(input)
    setResultado(data)
    setUltimosValores(valores)
  }

  return (
    <div>
      <Typography.Title level={3}>Calculadora Financiera</Typography.Title>
      <Typography.Paragraph type="secondary">
        Cálculo efímero: no queda guardado hasta que lo enlaces a una oportunidad.
      </Typography.Paragraph>

      <Row gutter={24}>
        <Col xs={24} lg={10}>
          <Card title="Parámetros">
            {/*
              §5.3: son puramente de presentación. NO participan del cálculo — el
              backend los devuelve resueltos solo para mostrarlos en la propuesta.
            */}
            <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
              <Select
                aria-label="Empresa (opcional, solo presentación)"
                placeholder="Empresa (opcional)"
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: '100%' }}
                loading={empresas.isLoading}
                value={idEmpresa ?? undefined}
                onChange={(valor: number | undefined) => setIdEmpresa(valor ?? null)}
                options={(empresas.data?.data ?? []).map((e) => ({
                  value: e.id,
                  label: e.razon_social,
                }))}
              />
              <Select
                aria-label="Modelo (opcional, solo presentación)"
                placeholder="Modelo (opcional)"
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: '100%' }}
                loading={modelos.isLoading}
                value={idModelo ?? undefined}
                onChange={(valor: number | undefined) => setIdModelo(valor ?? null)}
                options={(modelos.data ?? []).map((m) => ({ value: m.id, label: m.codigo }))}
              />
            </Space>

            <FormularioParametros
              etiquetaAccion="Calcular"
              modoEditable
              cargando={calculadora.isPending}
              onSubmit={handleCalcular}
            />
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          {resultado ? (
            <Card title="Resultado">
              <div style={{ marginBottom: 16 }}>
                <Typography.Text type="secondary">Cuota Financiera</Typography.Text>
                <Typography.Title level={2} style={{ margin: 0 }}>
                  {formatoMonto(resultado.cronograma.cuota_financiera)}
                </Typography.Title>
              </div>

              {/*
                CronogramaTabla ya trae Valor de Venta, IGV, Principal y Tasa
                Nominal Mensual en sus agregados (§5.4). NO renderizar
                `cuota_total` acá: el tipo `CalculadoraResultado` (Plan 03) ni
                siquiera lo tiene — sin ítem no hay `cuota_financiadora` que
                sumarle a la cuota Quantum (§5.3/§6.2). Dejar este comentario
                para que nadie lo "arregle" agregándolo.
              */}
              <CronogramaTabla
                cronograma={resultado.cronograma}
                modo={ultimosValores?.modo ?? 'leasing'}
              />

              <Divider />

              <Space>
                <Button type="primary" onClick={() => setModalAbierto(true)}>
                  Enlazar a Oportunidad
                </Button>
                {/*
                  TODO(T7.1): habilitar cuando exista <PropuestaFinanciera/>
                  (encargo §5.6). Es la MISMA propuesta que usa el módulo
                  Simulaciones — un solo componente para ambos orígenes.
                */}
                <Button disabled>Ver Propuesta</Button>
              </Space>
            </Card>
          ) : (
            <Card>
              <Typography.Text type="secondary">
                Completá los parámetros y calculá para ver el cronograma.
              </Typography.Text>
            </Card>
          )}
        </Col>
      </Row>

      <ModalEnlazarAOportunidad
        open={modalAbierto}
        valores={ultimosValores}
        onClose={() => setModalAbierto(false)}
      />
    </div>
  )
}

/**
 * Paso 5 de T3.1: "Enlazar a Oportunidad" NO es un endpoint propio de la
 * Calculadora (§24) — es literalmente `POST /simulaciones` con los mismos
 * parámetros del cálculo más el `id_oportunidad_item` elegido acá.
 *
 * D24 (no negociable, §5.2/reglas §1.1): con un solo ítem se enlaza directo y
 * el usuario NUNCA ve un selector de ítem. Con más de uno, hay que elegir.
 *
 * El listado de oportunidades usa `useOportunidades` (Plan 02/03) tal cual
 * existe hoy: sin un filtro de texto en `OportunidadesFiltros`, la búsqueda es
 * client-side sobre las oportunidades abiertas. Es deliberadamente simple —
 * no se inventa un endpoint de búsqueda que el backend no expone.
 */
function ModalEnlazarAOportunidad({
  open,
  valores,
  onClose,
}: {
  open: boolean
  valores: CrearSimulacionInput | null
  onClose: () => void
}) {
  const { message } = App.useApp()
  const [idOportunidad, setIdOportunidad] = useState<number | null>(null)
  const [idItem, setIdItem] = useState<number | null>(null)

  const oportunidades = useOportunidades({ incluir_cerradas: false }, open)
  const crearSimulacion = useCrearSimulacion()

  const lista: Oportunidad[] = oportunidades.data?.data ?? []
  const seleccionada = lista.find((o) => o.id === idOportunidad) ?? null
  const requiereSelectorItem = (seleccionada?.items.length ?? 0) > 1

  // D24: la condición es literal. Con un solo ítem se resuelve sin preguntar.
  const idItemResuelto =
    seleccionada === null
      ? null
      : seleccionada.items.length === 1
        ? (seleccionada.items[0]?.id ?? null)
        : idItem

  const handleCerrar = () => {
    setIdOportunidad(null)
    setIdItem(null)
    onClose()
  }

  const handleEnlazar = async () => {
    if (!valores || idItemResuelto === null) return
    try {
      await crearSimulacion.mutateAsync({ ...valores, id_oportunidad_item: idItemResuelto })
      message.success('Simulación enlazada a la oportunidad')
      handleCerrar()
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo enlazar la simulación'))
    }
  }

  return (
    <Modal
      title="Enlazar a Oportunidad"
      open={open}
      onCancel={handleCerrar}
      onOk={() => void handleEnlazar()}
      okButtonProps={{
        disabled: idItemResuelto === null,
        loading: crearSimulacion.isPending,
      }}
      destroyOnClose
    >
      <Select
        aria-label="Oportunidad"
        placeholder="Elegí una oportunidad"
        showSearch
        optionFilterProp="label"
        style={{ width: '100%', marginBottom: 16 }}
        loading={oportunidades.isLoading}
        value={idOportunidad ?? undefined}
        onChange={(valor: number) => {
          setIdOportunidad(valor)
          setIdItem(null)
        }}
        options={lista.map((o) => ({ value: o.id, label: `#${o.id} — ${o.empresa.razon_social}` }))}
      />

      {/*
        Encargo §5.2 / reglas §1.1 (D24, no negociable): con un solo ítem se
        enlaza directo y el usuario nunca ve un selector de ítem.
      */}
      {requiereSelectorItem && seleccionada && (
        <Select
          aria-label="Ítem a enlazar"
          placeholder="Elegí el ítem"
          style={{ width: '100%' }}
          value={idItem ?? undefined}
          onChange={setIdItem}
          options={seleccionada.items.map((it) => ({
            value: it.id,
            label: `${it.modelo.codigo} × ${it.cantidad}`,
          }))}
        />
      )}
    </Modal>
  )
}
