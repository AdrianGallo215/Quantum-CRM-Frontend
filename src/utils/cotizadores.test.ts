import { describe, expect, it } from 'vitest'
import { buscarCotizador, construirCotizadores, enRutaCotizable } from './cotizadores'

const URL_INVESTMENT = 'http://quantum.okserver43.com/app/modulos/cotizacion/'
const URL_LEASING = 'https://quantumleasing.okserver51.com/app/modulos/cotizacion/'

/** Entorno donde ninguna de las dos variables está definida. */
const SIN_ENV = {}

describe('construirCotizadores', () => {
  it('devuelve los dos cotizadores en orden Investment → Leasing', () => {
    const cotizadores = construirCotizadores(SIN_ENV)

    expect(cotizadores.map((c) => c.id)).toEqual(['investment', 'leasing'])
    expect(cotizadores.map((c) => c.nombre)).toEqual(['Quantum Investment', 'Quantum Leasing'])
  })

  it('cae a las URLs por defecto cuando el entorno no define ninguna', () => {
    const cotizadores = construirCotizadores(SIN_ENV)

    expect(buscarCotizador(cotizadores, 'investment').url).toBe(URL_INVESTMENT)
    expect(buscarCotizador(cotizadores, 'leasing').url).toBe(URL_LEASING)
  })

  it('el cotizador de Leasing apunta a un origen HTTPS por defecto', () => {
    // Investment sigue sin TLS (hallazgo M-2 de la auditoría de seguridad).
    // Leasing nace con certificado y no debe perderlo en un futuro cambio.
    const leasing = buscarCotizador(construirCotizadores(SIN_ENV), 'leasing')

    expect(new URL(leasing.url).protocol).toBe('https:')
  })

  it('permite sobrescribir cada URL de forma independiente', () => {
    const cotizadores = construirCotizadores({
      VITE_COTIZADOR_URL: 'https://otro-investment.example/cotizar/',
      VITE_COTIZADOR_LEASING_URL: 'https://otro-leasing.example/cotizar/',
    })

    expect(buscarCotizador(cotizadores, 'investment').url).toBe(
      'https://otro-investment.example/cotizar/',
    )
    expect(buscarCotizador(cotizadores, 'leasing').url).toBe('https://otro-leasing.example/cotizar/')
  })

  it('ignora una variable en blanco y cae al valor por defecto', () => {
    // Docker y GitHub Actions pasan siempre la variable: cuando no está
    // configurada llega como cadena vacía o con espacios, nunca como undefined.
    const cotizadores = construirCotizadores({
      VITE_COTIZADOR_URL: '   ',
      VITE_COTIZADOR_LEASING_URL: '',
    })

    expect(buscarCotizador(cotizadores, 'investment').url).toBe(URL_INVESTMENT)
    expect(buscarCotizador(cotizadores, 'leasing').url).toBe(URL_LEASING)
  })

  it('recorta los espacios alrededor de una URL configurada', () => {
    const cotizadores = construirCotizadores({
      VITE_COTIZADOR_URL: '  https://con-espacios.example/cotizar/  ',
    })

    expect(buscarCotizador(cotizadores, 'investment').url).toBe(
      'https://con-espacios.example/cotizar/',
    )
  })

  it('asigna un ícono a cada cotizador', () => {
    const cotizadores = construirCotizadores(SIN_ENV)

    expect(buscarCotizador(cotizadores, 'investment').icono).toBe('corporate_fare')
    expect(buscarCotizador(cotizadores, 'leasing').icono).toBe('directions_bus')
  })
})

describe('buscarCotizador', () => {
  it('lanza si el id no existe, en vez de devolver undefined', () => {
    // `noUncheckedIndexedAccess` obliga a tratar el caso; fallar ruidosamente
    // es mejor que propagar un `undefined` hasta un `window.open`.
    const cotizadores = construirCotizadores(SIN_ENV)

    expect(() => buscarCotizador(cotizadores, 'investment')).not.toThrow()
    expect(() => buscarCotizador([], 'leasing')).toThrow('leasing')
  })
})

describe('enRutaCotizable', () => {
  it('acepta el pipeline y el detalle de una oportunidad', () => {
    expect(enRutaCotizable('/pipeline')).toBe(true)
    expect(enRutaCotizable('/oportunidades/42')).toBe(true)
  })

  it('rechaza el resto de pantallas', () => {
    expect(enRutaCotizable('/')).toBe(false)
    expect(enRutaCotizable('/cartera')).toBe(false)
    expect(enRutaCotizable('/admin')).toBe(false)
    expect(enRutaCotizable('/reportes')).toBe(false)
  })

  it('no confunde rutas que solo comparten el prefijo', () => {
    // `/oportunidades` es el listado sin id: ahí no hay nada que cotizar.
    expect(enRutaCotizable('/oportunidades')).toBe(false)
    expect(enRutaCotizable('/pipeline-resumen')).toBe(false)
  })
})
