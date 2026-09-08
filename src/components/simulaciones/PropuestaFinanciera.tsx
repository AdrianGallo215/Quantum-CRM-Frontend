import { CronogramaTabla } from './CronogramaTabla'
import { formatoFecha, formatoMonto } from '@/utils/formato'
import { formatoTea } from '@/utils/simulaciones'
import { ETIQUETA_MODO_SIMULACION } from '@/utils/propuesta'
import type { DatosPropuesta } from '@/utils/propuesta'
import '@/styles/impresion.css'

/**
 * Propuesta financiera imprimible (T7.1 · encargo §5.6).
 *
 * **Un solo componente para los dos orígenes** (§5.6: "Es la MISMA
 * `<PropuestaFinanciera/>` para el módulo Simulaciones y para la Calculadora"). Lo
 * consigue recibiendo un `DatosPropuesta` ya armado por uno de los dos adaptadores de
 * `utils/propuesta.ts` (D26) — no una `Simulacion`, que el resultado efímero de la
 * Calculadora no es ni puede fingir ser (§24).
 *
 * **Componente tonto**, igual que `CronogramaTabla` (D23): no consulta nada por su
 * cuenta y no calcula nada de negocio. La única cifra que deriva es el total por N
 * unidades, que es una multiplicación de PRESENTACIÓN (ver `TotalPorUnidades`).
 *
 * **Regla 9 de `CLAUDE.md`:** `titulo`, `empresa` y `modelo` vienen del servidor y se
 * renderizan como texto plano de React. En este archivo NO hay
 * `dangerouslySetInnerHTML` y no debe haberlo nunca.
 *
 * **§5.6 — el PDF no se almacena:** se genera con `window.print()` (D27) y el usuario
 * elige "Guardar como PDF" en el diálogo del navegador. La app no guarda el archivo,
 * no lo sube a Drive y no lo registra: no hay endpoint para eso y no debe inventarse.
 */
export function PropuestaFinanciera({ datos }: { datos: DatosPropuesta }) {
  const hoy = new Date().toISOString()

  return (
    <article className="propuesta-impresa mx-auto max-w-4xl bg-surface-lowest p-8 font-body text-on-surface">
      <Encabezado datos={datos} hoy={hoy} />

      {/* Se OMITE entero si no hay razón social: un bloque "Cliente: —" no informa
          nada y en una propuesta impresa queda como un error. */}
      {datos.empresa !== null && <BloqueCliente empresa={datos.empresa} />}

      <Resumen datos={datos} />

      <section aria-label="Cronograma de pagos" className="mb-8">
        <h3 className="mb-3 text-title-md font-semibold">Cronograma de pagos</h3>
        <CronogramaTabla cronograma={datos.cronograma} modo={datos.modo} />
      </section>

      <Pie hoy={hoy} />

      {/*
        `no-imprimir` (D27): el botón es cromo de la aplicación, no del documento —
        una propuesta impresa con un botón dentro se ve como una captura de pantalla.
        Va dentro del componente a propósito: la propuesta es autosuficiente y quien
        la monta (módulo o Calculadora) no tiene que recordar añadir la acción.
      */}
      <div className="no-imprimir mt-8 flex justify-end border-t border-outline-variant pt-6">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-primary px-6 py-2 text-label-lg font-semibold text-on-primary"
        >
          Descargar PDF
        </button>
      </div>
    </article>
  )
}

function Encabezado({ datos, hoy }: { datos: DatosPropuesta; hoy: string }) {
  return (
    <header className="propuesta-encabezado mb-8 border-b border-outline-variant pb-6">
      <h1 className="text-title-lg font-bold uppercase tracking-widest text-primary">
        Quantum Investment
      </h1>
      <p className="text-body-sm text-on-surface-variant">
        Representante exclusivo de buses KinWin en Perú
      </p>

      {/* Texto plano del servidor (regla 9): nunca inyectado como HTML. */}
      <h2 className="mt-4 text-headline-sm font-semibold">{datos.titulo}</h2>

      <p className="mt-1 text-body-sm text-on-surface-variant">
        Fecha de emisión: {formatoFecha(hoy)}
      </p>
    </header>
  )
}

function BloqueCliente({ empresa }: { empresa: string }) {
  return (
    <section aria-label="Empresa cliente" className="mb-8">
      <span className="mb-1 block text-label-md uppercase tracking-wider text-on-surface-variant">
        Empresa cliente
      </span>
      <span className="text-title-md font-semibold">{empresa}</span>
    </section>
  )
}

/**
 * Las métricas del documento. Van dentro de una `region` con nombre porque
 * `CronogramaTabla` publica agregados con rótulos homónimos ("Cuota final", "Valor de
 * venta"): sin la sección, ni el usuario de lector de pantalla ni el test podrían
 * distinguir a cuál de los dos bloques pertenece cada cifra.
 */
function Resumen({ datos }: { datos: DatosPropuesta }) {
  const { parametros, cronograma, cantidad, modelo } = datos

  return (
    <section
      aria-label="Resumen de la propuesta"
      className="propuesta-resumen mb-8 rounded-lg border border-outline-variant p-6"
    >
      <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
        <Metrica etiqueta="Cuota final" valor={formatoMonto(cronograma.cuota_final)} />
        <Metrica etiqueta="TEA" valor={formatoTea(parametros.tea)} />
        <Metrica etiqueta="Valor de venta" valor={formatoMonto(cronograma.valor_venta)} />
        <Metrica etiqueta="Plazo" valor={`${parametros.plazo_meses} meses`} />
        <Metrica etiqueta="Modalidad" valor={ETIQUETA_MODO_SIMULACION[parametros.modo]} />
      </div>

      <div className="mt-6 border-t border-outline-variant pt-6">
        {cantidad === null ? <PorUnidad /> : <TotalPorUnidades
          cantidad={cantidad}
          modelo={modelo}
          cuotaFinal={cronograma.cuota_final}
        />}
      </div>
    </section>
  )
}

/**
 * D26, resolución de K29 (la pregunta que el encargo §8.2 delega al diseño): sin ítem
 * NO hay cantidad, y la propuesta lo dice en vez de inventar un `1`. Un total
 * calculado sobre una unidad supuesta sería falso en cuanto la simulación se enlace a
 * un ítem de 8 — y nadie lo pidió. Acá NO va ningún total.
 */
function PorUnidad() {
  return (
    <div>
      <span className="text-title-sm font-semibold">Cotización por unidad</span>
      <p className="mt-1 text-body-sm text-on-surface-variant">
        Las cifras corresponden a una unidad. Esta propuesta no está asociada a un ítem
        de oportunidad, por lo que no incluye un total por cantidad.
      </p>
    </div>
  )
}

/**
 * `cantidad` y `modelo` NO participan del cálculo (`reglas_simulaciones.md` §11): solo
 * se muestran.
 *
 * ⚠ El total es una **derivación de visualización**, no de negocio: es literalmente la
 * cuota final que el backend ya calculó, repetida N veces para el lector. NO es el
 * motor de cálculo —que es del backend (§3)— y no debe crecer hacia serlo: si alguna
 * vez hiciera falta un total con reglas propias (descuentos por volumen, etc.), lo
 * calcula el backend y llega en el DTO.
 */
function TotalPorUnidades({
  cantidad,
  modelo,
  cuotaFinal,
}: {
  cantidad: number
  modelo: string | null
  cuotaFinal: string
}) {
  const total = Number(cuotaFinal) * cantidad

  return (
    <div className="flex flex-wrap gap-8">
      <div role="group" aria-label="Cantidad de unidades">
        <span className="mb-1 block text-label-md uppercase tracking-wider text-on-surface-variant">
          Cantidad de unidades
        </span>
        <span className="text-title-sm font-semibold">
          {cantidad}
          {modelo !== null && (
            <>
              {' × '}
              <span>{modelo}</span>
            </>
          )}
        </span>
      </div>

      <div role="group" aria-label={`Total por ${cantidad} unidades`}>
        <span className="mb-1 block text-label-md uppercase tracking-wider text-on-surface-variant">
          Total por {cantidad} unidades
        </span>
        <span className="text-title-sm font-semibold tabular-nums">
          {Number.isNaN(total) ? '—' : formatoMonto(total)}
        </span>
      </div>
    </div>
  )
}

function Pie({ hoy }: { hoy: string }) {
  return (
    <footer className="propuesta-pie border-t border-outline-variant pt-6 text-body-sm text-on-surface-variant">
      <p>Documento generado el {formatoFecha(hoy)} por Quantum Investment.</p>
      <p>
        Validez: las condiciones de esta propuesta están sujetas a revisión y no
        constituyen una oferta vinculante.
      </p>
    </footer>
  )
}

/** `role="group"` + `aria-label` mantienen unidos rótulo y valor, igual que en
 *  `CronogramaTabla`: es lo que permite afirmar cuál cifra lleva cuál etiqueta. */
function Metrica({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div role="group" aria-label={etiqueta}>
      <span className="mb-1 block text-label-md uppercase tracking-wider text-on-surface-variant">
        {etiqueta}
      </span>
      <span className="text-body-lg font-semibold tabular-nums text-on-surface">{valor}</span>
    </div>
  )
}
