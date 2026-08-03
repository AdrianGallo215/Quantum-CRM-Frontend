# Quantum CRM Frontend — Estrategia de Testing (TDD)

> El frontend se desarrolla **estrictamente Test-Driven**. Este documento define cómo. Claude Code lo lee antes de escribir código y lo sigue en cada tarea.

---

## 1. Por qué TDD es obligatorio

Un agente de IA genera componentes que *parecen* correctos pero fallan en interacción real, en estados de carga/error, o desincronizan datos. TDD obliga a definir el comportamiento esperado antes de implementarlo:

- Cada componente y hook tiene una especificación ejecutable antes de existir.
- Los errores de integración (queries, mutaciones, validación) se detectan al escribirlos.
- La sincronización 360 del cliente se vuelve verificable, no una esperanza.

**Regla dura:** no se escribe componente ni hook sin un test que falle apuntándolo. Ninguna tarea termina sin sus tests pasando.

---

## 2. El ciclo Red-Green-Refactor

```
1. RED    — Test del comportamiento del componente/hook. Ejecutar. DEBE fallar.
2. GREEN  — Mínimo código para que pase. Ejecutar. DEBE pasar.
3. REFACTOR — Mejorar sin cambiar comportamiento. Tests verdes.
```

**Ejemplo — validación de formulario:**

```typescript
// RED — el componente aún no valida.
describe('FormularioCrearOportunidad', () => {
  it('no permite enviar sin modelo seleccionado', async () => {
    render(<FormularioCrearOportunidad empresaId={3} />)
    await userEvent.click(screen.getByRole('button', { name: /crear/i }))
    expect(await screen.findByText(/el modelo es obligatorio/i)).toBeInTheDocument()
  })
})

// GREEN — agregar el schema Zod con la validación de idModelo y conectarlo.
// REFACTOR — extraer el schema, mejorar mensajes. Test verde.
```

---

## 3. Stack de testing

```
Vitest                       — runner (rápido, nativo de Vite)
React Testing Library        — testing de componentes orientado al usuario
MSW (Mock Service Worker)    — intercepta requests HTTP a nivel de red
@testing-library/user-event  — simula interacciones reales
Vitest coverage (c8)         — cobertura
```

**Por qué MSW y no mocks de fetch/axios:** MSW intercepta a nivel de red, así que el código real (incluyendo TanStack Query y el cliente Axios) corre como en producción. No se mockea el cliente de API — se mockea la respuesta del servidor. Esto prueba la integración real entre componentes, queries y manejo de estado, que es justo donde aparecen los bugs de sincronización.

---

## 4. Qué se testea

La pirámide del frontend prioriza tests de comportamiento sobre tests de implementación. No se testean detalles internos (estado de un useState), se testea lo que el usuario ve y hace.

### 4.1 Componentes con lógica de interacción

```typescript
describe('FormularioCrearOportunidad', () => {
  it('muestra el monto calculado al ingresar cantidad y descuento', async () => {
    render(<FormularioCrearOportunidad empresaId={3} />)

    await userEvent.selectOptions(screen.getByLabelText(/modelo/i), 'KinWin K12')
    await userEvent.type(screen.getByLabelText(/cantidad/i), '8')
    await userEvent.type(screen.getByLabelText(/descuento/i), '3')

    // monto_total es read-only y se calcula en vivo en el cliente
    expect(screen.getByLabelText(/monto total/i)).toHaveValue('713,920.00')
  })
})
```

### 4.2 El modal de sugerencia de cambio de estado

Comportamiento crítico de `reglas_negocio.md`: confirmar ejecuta una segunda llamada, descartar no.

```typescript
describe('Modal de sugerencia de cambio de estado', () => {
  it('al confirmar, ejecuta la segunda llamada de cambio de estado', async () => {
    // MSW: PATCH /eventos/:id/ocurrido devuelve sugerencia con dispara=true
    // Se marca el evento, aparece el modal, se confirma
    // Verificar que se llamó PATCH /oportunidades/:id/estado
  })

  it('al descartar, NO ejecuta el cambio de estado', async () => {
    // Mismo setup, pero se descarta
    // Verificar que PATCH /oportunidades/:id/estado NO se llamó
  })
})
```

### 4.3 El aviso crítico de retroceso

```typescript
it('muestra el aviso crítico antes de retroceder una etapa', async () => {
  // Estado actual: documentos_legales. Se intenta volver a evaluacion_calidda.
  // Verificar que aparece el diálogo de confirmación antes de ejecutar
})
```

### 4.4 Sincronización 360 — el principio crítico

```typescript
describe('Sincronización tras editar empresa', () => {
  it('refleja el cambio de razón social en cartera tras editarla en el detalle', async () => {
    // MSW devuelve la empresa con razón social A
    // Se navega al detalle, se edita a razón social B
    // La mutación invalida las queries; MSW ahora devuelve B
    // Se navega a cartera y se verifica que muestra B, no A
  })
})
```

Este es el test que protege el principio más importante del frontend. Cada flujo donde una mutación debe propagarse a otras vistas tiene un test así.

**Cobertura obligatoria del frontend:**

- Formularios con validación Zod (crear oportunidad, crear empresa, cambiar estado)
- Cálculo en vivo de `monto_total` (read-only)
- Modal de sugerencia: confirmar vs. descartar
- Aviso crítico de retroceso
- Sincronización 360: tras mutación, las vistas dependientes muestran el dato actualizado
- Guards de router: un rol sin acceso a una ruta es redirigido
- Manejo de 401: el interceptor intenta refresh y, si falla, redirige a login

---

## 5. Qué NO testear

- Detalles de implementación interna (valores de useState, nombres de variables).
- Estilos y CSS exactos (eso es responsabilidad de la revisión visual, no de tests automatizados).
- Componentes de Ant Design en sí mismos (ya están testeados por su librería). Se testea cómo los usamos, no que funcionen.

---

## 6. Gates de cobertura

```
Hooks y utils con lógica: mínimo 85%
Global del frontend: mínimo 70%
```

La cobertura de UI es más laxa que la del backend porque parte del valor visual no se captura bien en tests automatizados. Pero los hooks (especialmente los de TanStack Query con su lógica de invalidación) y los utils (formato de montos, fechas, cálculos en vivo) sí tienen cobertura alta porque ahí vive lógica que puede fallar silenciosamente.

Herramienta: **Vitest coverage**. El CI falla si baja del umbral.

---

## 7. Convenciones de nombres

Nombres que describen el comportamiento desde la perspectiva del usuario.

```typescript
it('no permite enviar el formulario sin modelo seleccionado')
it('muestra el aviso crítico antes de retroceder una etapa')
it('refleja el cambio en cartera tras editarlo en el detalle')
```

Estructura **Arrange-Act-Assert**: renderizar, interactuar, verificar.

---

## 8. Tests por fase

| Fase | Tests escritos primero |
|---|---|
| Fase 0 | Login valida campos; credenciales inválidas muestran mensaje genérico; interceptor maneja 401; guards redirigen según rol |
| Fase 1 | Formularios de admin validan; crear modelo sin aplicaciones muestra error de la API |
| Fase 2 | Check de RUC duplicado antes de continuar; búsqueda de contacto existente; tabs derivados read-only |
| Fase 3 | Cálculo de monto en vivo; modal de sugerencia (confirmar/descartar); aviso de retroceso; sincronización 360 tras mutación |
| Fase 4 | Historial colapsable; crear tarea/evento actualiza la vista |
| Fase 5 | Prospección muestra las dos zonas; convertir solo con 3 hitos |
| Fase 6 | Reportes muestran la advertencia de muestra pequeña; vendedor redirigido de /reportes |

---

## 9. Reglas finales

1. **Nunca escribir componente ni hook sin un test que falle primero.**
2. **Nunca commitear con tests en rojo.** `npm run test` debe pasar.
3. **Testear comportamiento del usuario, no implementación interna.**
4. **MSW para todo lo que toque la red.** Nunca mockear el cliente de API directamente.
5. **Ante un bug, primero el test que lo reproduce (falla), luego la corrección.**
