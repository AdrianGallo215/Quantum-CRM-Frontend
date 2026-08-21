import { describe, expect, it } from 'vitest'
import { APLICACIONES, SEGMENTOS } from './enums'

/**
 * `aplicacion_enum` y `segmento_enum` se parecen pero NO son el mismo enum:
 * segmento admite `otro` y aplicacion no. Confundirlos hacía que el formulario
 * de modelos ofreciera una opción que el backend rechaza con 400.
 */
describe('APLICACIONES', () => {
  it('coincide exactamente con aplicacion_enum del contrato §23', () => {
    expect([...APLICACIONES].sort()).toEqual(
      ['interprovincial', 'personal', 'turismo', 'urbano'].sort(),
    )
  })

  it('no incluye otro, a diferencia de SEGMENTOS', () => {
    expect(APLICACIONES).not.toContain('otro')
    expect(SEGMENTOS).toContain('otro')
  })
})
