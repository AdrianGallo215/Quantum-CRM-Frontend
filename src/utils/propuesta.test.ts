import { describe, expect, it } from 'vitest'
import { propuestaDesdeCalculadora, propuestaDesdeSimulacion } from './propuesta'
import type { Cronograma, FilaCronograma, Simulacion } from '@/types/simulacion'
import type { CalculadoraInput, CalculadoraResultado } from '@/types/calculadora'

/**
 * Los dos adaptadores de D26. El caso que fija la decisión que el encargo §8.2
 * delega al diseño (K29) es `cantidad: null`: NUNCA se inventa un `1`.
 */

const MES_0: FilaCronograma = {
  mes: 0,
  saldo_inicial: '275000.00',
  amortizacion: '45000.00',
  interes: null,
  igv: null,
  saldo_final: '230000.00',
  cuota: null,
  cuota_con_igv: null,
}

function cronograma(sobrescribe: Partial<Cronograma> = {}): Cronograma {
  return {
    cuota_final: '8218.90',
    cuota_financiera: '6965.17',
    valor_venta: '275000.00',
    igv: '49500.00',
    principal: '230000.00',
    tasa_nominal_mensual: '1.171491691350098',
    filas: [
      MES_0,
      {
        mes: 1,
        saldo_inicial: '230000.00',
        amortizacion: '4270.83',
        interes: '2694.34',
        igv: null,
        saldo_final: '225729.17',
        cuota: '6965.17',
        cuota_con_igv: '8218.90',
      },
    ],
    ...sobrescribe,
  }
}

function simulacion(sobrescribe: Partial<Simulacion> = {}): Simulacion {
  return {
    id: 12,
    nombre: 'Leasing 48m · KW-12',
    nombre_es_manual: false,
    modo: 'leasing',
    id_oportunidad_item: 7,
    id_oportunidad: 3,
    id_modelo: 2,
    modelo: { id: 2, codigo: 'KW-12' },
    id_simulacion_origen: null,
    precio_venta: '275000.00',
    descuento: '0.00',
    cuota_inicial: '45000.00',
    plazo_meses: 48,
    tea: '14.00',
    valor_residual: '25000.00',
    dias_trabajados: 22,
    comision_estructuracion: '1180.00',
    cuota_final: '8218.90',
    es_principal: true,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    eliminacion_prevista_el: null,
    ...sobrescribe,
  }
}

function resultado(sobrescribe: Partial<CalculadoraResultado> = {}): CalculadoraResultado {
  return {
    empresa: { id: 5, razon_social: 'Transportes del Sur S.A.C.' },
    modelo: { id: 2, codigo: 'KW-12' },
    cronograma: cronograma(),
    ...sobrescribe,
  }
}

function input(sobrescribe: Partial<CalculadoraInput> = {}): CalculadoraInput {
  return {
    modo: 'credito_directo',
    precio_venta: '275000.00',
    cuota_inicial: '45000.00',
    plazo_meses: 36,
    tea: '14.00',
    valor_residual: '25000.00',
    ...sobrescribe,
  }
}

describe('propuestaDesdeSimulacion', () => {
  it('propaga la cantidad del ítem cuando la hay', () => {
    // §5.6: la propuesta muestra la cantidad de unidades del ítem. La simulación
    // es SIEMPRE de una unidad y su DTO no trae `cantidad` (K29): quien llama la
    // saca de `items[]` de la oportunidad y la pasa acá.
    const datos = propuestaDesdeSimulacion(simulacion(), cronograma(), 8)

    expect(datos.cantidad).toBe(8)
  })

  it('deja la cantidad en null en una simulación huérfana', () => {
    // D26/K29: sin ítem no hay cantidad. `null` explícito, nunca `1`.
    const datos = propuestaDesdeSimulacion(
      simulacion({ id_oportunidad_item: null, id_oportunidad: null, es_principal: false }),
      cronograma(),
      null,
    )

    expect(datos.cantidad).toBeNull()
  })

  it('toma el título del nombre y el modelo de su código', () => {
    const datos = propuestaDesdeSimulacion(simulacion(), cronograma(), 8)

    expect(datos.titulo).toBe('Leasing 48m · KW-12')
    expect(datos.modelo).toBe('KW-12')
    expect(datos.modo).toBe('leasing')
    expect(datos.parametros.plazo_meses).toBe(48)
    expect(datos.parametros.tea).toBe('14.00')
    expect(datos.parametros.precio_venta).toBe('275000.00')
    expect(datos.parametros.valor_residual).toBe('25000.00')
  })

  it('deja el modelo en null cuando la simulación no lo tiene', () => {
    const datos = propuestaDesdeSimulacion(simulacion({ modelo: null, id_modelo: null }), cronograma(), 8)

    expect(datos.modelo).toBeNull()
  })

  it('deja la empresa en null por default: sin 4º argumento no se inventa', () => {
    // `Simulacion` (src/types/simulacion.ts) no tiene razón social: solo el ítem y
    // la oportunidad la tienen. Si quien llama no pasa el 4º argumento (ej. un
    // llamador que todavía no la resolvió), se omite en vez de inventarla.
    const datos = propuestaDesdeSimulacion(simulacion(), cronograma(), 8)

    expect(datos.empresa).toBeNull()
  })

  it('propaga la empresa cuando quien llama la pasa', () => {
    // La oportunidad ya cargada trae `empresa.razon_social`: quien arma el
    // llamador la pasa acá sin un request extra (ver SimulacionDetallePage).
    const datos = propuestaDesdeSimulacion(simulacion(), cronograma(), 8, 'Transportes del Sur S.A.C.')

    expect(datos.empresa).toBe('Transportes del Sur S.A.C.')
  })

  it('usa el cronograma que recibe, sin recalcular nada', () => {
    // El motor de cálculo es del backend (`reglas_simulaciones.md` §3).
    const c = cronograma()
    const datos = propuestaDesdeSimulacion(simulacion(), c, 8)

    expect(datos.cronograma).toBe(c)
  })
})

describe('propuestaDesdeCalculadora', () => {
  it('SIEMPRE deja la cantidad en null: en la Calculadora no hay ítem', () => {
    // §24: el resultado de la Calculadora es efímero y no está enlazado a nada.
    // No existe ítem del cual sacar una cantidad, ni con empresa ni con modelo.
    expect(propuestaDesdeCalculadora(resultado(), input()).cantidad).toBeNull()
    expect(
      propuestaDesdeCalculadora(resultado({ empresa: null, modelo: null }), input()).cantidad,
    ).toBeNull()
  })

  it('toma empresa y modelo ya resueltos del resultado, no del input', () => {
    // §5.3: `id_empresa`/`id_modelo` no participan del cálculo — el backend los
    // devuelve RESUELTOS solo para mostrarlos en la propuesta.
    const datos = propuestaDesdeCalculadora(resultado(), input())

    expect(datos.empresa).toBe('Transportes del Sur S.A.C.')
    expect(datos.modelo).toBe('KW-12')
  })

  it('usa un título genérico: el resultado efímero no tiene nombre', () => {
    // §24: "No hay `id`, `created_at`, `es_principal` ni `nombre` en la respuesta:
    // no existe fila que los tenga". El título es del documento, no de una fila.
    expect(propuestaDesdeCalculadora(resultado(), input()).titulo).toBe('Cotización financiera')
  })

  it('acepta empresa y modelo ausentes: los dos son opcionales', () => {
    const datos = propuestaDesdeCalculadora(resultado({ empresa: null, modelo: null }), input())

    expect(datos.empresa).toBeNull()
    expect(datos.modelo).toBeNull()
  })

  it('toma los parámetros del input, que es donde están', () => {
    // El resultado solo trae empresa, modelo y cronograma: los parámetros del
    // cálculo únicamente existen en el input que se envió.
    const datos = propuestaDesdeCalculadora(resultado(), input())

    expect(datos.modo).toBe('credito_directo')
    expect(datos.parametros.modo).toBe('credito_directo')
    expect(datos.parametros.plazo_meses).toBe(36)
    expect(datos.parametros.precio_venta).toBe('275000.00')
    expect(datos.parametros.tea).toBe('14.00')
    expect(datos.parametros.valor_residual).toBe('25000.00')
  })

  it('cae al default del backend cuando el input omite valor_residual', () => {
    // `valor_residual` es opcional en `CalculadoraInput`: si se omite, el backend
    // aplica el default de reglas §6.1 — el mismo que `DEFAULTS_SIMULACION`. Se
    // muestra ese, que es el que de verdad se usó en el cálculo.
    const sinResidual: CalculadoraInput = input()
    delete sinResidual.valor_residual
    const datos = propuestaDesdeCalculadora(resultado(), sinResidual)

    expect(datos.parametros.valor_residual).toBe('25000')
  })

  it('usa el cronograma del resultado tal cual', () => {
    const r = resultado()
    const datos = propuestaDesdeCalculadora(r, input())

    expect(datos.cronograma).toBe(r.cronograma)
  })
})
