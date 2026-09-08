import { describe, expect, it } from 'vitest'
import { qk } from './queryKeys'

/**
 * La promesa del módulo es que invalidar la lista alcanza también a los detalles.
 * Eso solo es cierto si la key del detalle EMPIEZA por la key de la lista —
 * que es exactamente el criterio de prefijo que usa TanStack Query.
 */
function esPrefijoDe(prefijo: readonly unknown[], key: readonly unknown[]): boolean {
  return prefijo.every((parte, i) => key[i] === parte)
}

describe('qk — jerarquía de prefijos', () => {
  it('el detalle de empresa cuelga de la lista de empresas', () => {
    expect(esPrefijoDe(qk.empresas, qk.empresa(5))).toBe(true)
  })

  it('los eventos de empresa cuelgan del detalle de empresa', () => {
    expect(esPrefijoDe(qk.empresa(5), qk.empresaEventos(5))).toBe(true)
  })

  it('el detalle de oportunidad cuelga de la lista de oportunidades', () => {
    expect(esPrefijoDe(qk.oportunidades, qk.oportunidad(5))).toBe(true)
  })

  it('el log y los eventos cuelgan del detalle de oportunidad', () => {
    expect(esPrefijoDe(qk.oportunidad(5), qk.oportunidadLog(5))).toBe(true)
    expect(esPrefijoDe(qk.oportunidad(5), qk.oportunidadEventos(5))).toBe(true)
  })

  it('el detalle de contacto cuelga de la lista de contactos', () => {
    expect(esPrefijoDe(qk.contactos, qk.contacto(5))).toBe(true)
  })

  it('el detalle de solicitud cuelga de la lista de solicitudes', () => {
    expect(esPrefijoDe(qk.solicitudes, qk.solicitud(5))).toBe(true)
  })

  it('el detalle de simulacion cuelga de la lista de simulaciones', () => {
    // K25/D17: sin esto, `invalidar(qc, qk.simulaciones)` tras una escritura no
    // alcanzaria a la simulacion abierta y la pantalla mostraria la cuota vieja.
    expect(esPrefijoDe(qk.simulaciones, qk.simulacion(5))).toBe(true)
  })

  it('el cronograma y el historial cuelgan del detalle de simulacion', () => {
    // K26: son queries propias (endpoints propios), no derivados del detalle.
    // Colgar de el es lo que hace que una sola invalidacion las arrastre.
    expect(esPrefijoDe(qk.simulacion(5), qk.simulacionCronograma(5))).toBe(true)
    expect(esPrefijoDe(qk.simulacion(5), qk.simulacionHistorial(5))).toBe(true)
    expect(esPrefijoDe(qk.simulaciones, qk.simulacionCronograma(5))).toBe(true)
    expect(esPrefijoDe(qk.simulaciones, qk.simulacionHistorial(5))).toBe(true)
  })

  it('el cronograma y el historial de una simulacion no se pisan entre si', () => {
    expect(esPrefijoDe(qk.simulacionCronograma(5), qk.simulacionHistorial(5))).toBe(false)
    expect(esPrefijoDe(qk.simulacion(5), qk.simulacion(6))).toBe(false)
    expect(esPrefijoDe(qk.simulacionCronograma(5), qk.simulacionCronograma(6))).toBe(false)
  })

  it('las simulaciones no cuelgan de las oportunidades ni al reves', () => {
    // Son arboles separados a proposito: por eso cada mutacion de simulacion
    // tiene que invalidar la oportunidad EXPLICITAMENTE (D18). Si un dia esta
    // asercion se volviera `true`, la invalidacion doble seria redundante; hoy
    // omitirla deja un monto viejo en el Pipeline.
    expect(esPrefijoDe(qk.oportunidades, qk.simulacion(5))).toBe(false)
    expect(esPrefijoDe(qk.simulaciones, qk.oportunidad(5))).toBe(false)
  })

  it('el tipo de cambio no cuelga de ninguna lista del CRM', () => {
    expect(esPrefijoDe(qk.simulaciones, qk.tipoCambio)).toBe(false)
    expect(esPrefijoDe(qk.oportunidades, qk.tipoCambio)).toBe(false)
  })

  it('detalles de entidades distintas no colisionan', () => {
    expect(esPrefijoDe(qk.empresas, qk.oportunidad(5))).toBe(false)
    expect(esPrefijoDe(qk.empresa(5), qk.empresa(6))).toBe(false)
  })
})
