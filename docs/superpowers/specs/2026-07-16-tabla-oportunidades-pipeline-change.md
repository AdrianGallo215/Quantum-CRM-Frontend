# Vista de tabla en Pipeline (toggle Kanban/Tabla)

- Archivos: `src/pages/Pipeline/PipelinePage.tsx`, `src/pages/Pipeline/TablaOportunidades.tsx` (nuevo).
- `PipelinePage`: estado local `vista: 'kanban' | 'tabla'`, toggle con dos botones. Reutiliza la misma query `useOportunidades` ya usada por el Kanban — no hay segunda llamada a `GET /oportunidades`.
- `TablaOportunidades` recibe `oportunidades: Oportunidad[]` (mismo array `oportunidades.data?.data` del Kanban) y renderiza un `Table` de Ant Design.
- Columnas base (fijas): Id, Nombre de Oportunidad (`modelo.codigo`), Vendedor Asignado (`nombreCompleto(vendedor)`), Empresa (`empresa.razon_social`), Unidades (`cantidad`), Monto Total (`formatoMonto(monto_total)`), Etapa (`EtapaTag` sobre `estado`), Notas (`notas`), Persona Contacto (siempre `'—'`).
  - Persona Contacto queda vacía porque `GET /oportunidades` (listado) no incluye `contactos` — solo `GET /oportunidades/:id` lo trae, según `contrato_api.md`. Pendiente: si se necesita el dato real, solicitar al backend agregar `contacto_principal` (o similar) al listado.
- Nombre de Oportunidad usa `modelo.codigo` porque el contrato no expone un campo de "nombre" propio de la oportunidad.
- Columnas opcionales (selector "Columnas", checkboxes, apagadas por defecto): Financiadora, Precio Unitario, Descuento, Garantía, Financiamiento Paralelo, Ficha de Venta, Motivo de Cierre, Fecha Cierre Estimado, Tareas Pendientes, Eventos Pendientes, Creado. Todas provienen del mismo body de `GET /oportunidades`, sin fetch adicional.
- Click en fila navega a `/oportunidades/:id` (mismo comportamiento que la tarjeta del Kanban).
- Sin cambios en `src/api/oportunidades.ts` ni en `src/types`.

## Actualización 2026-07-16: columnas togglables + persistencia + filtros/orden

- `TablaOportunidades.tsx` reescrito: las 19 columnas (base + opcionales) ahora viven en un solo array `DEFINICIONES` (`key`, `titulo`, `visiblePorDefecto`, `construir(oportunidades)`), todas togglables desde el selector "Columnas" (incluye las 9 por defecto, ya no son fijas).
- Persistencia de la selección: `sessionStorage` bajo la clave `quantum_pipeline_tabla_columnas` (JSON de `keys` activas). Se lee con lazy `useState` init y se escribe en un `useEffect` al cambiar. Si el valor guardado es inválido o vacío, cae a `columnasPorDefecto()`.
- Orden por encabezado: `sorter` cliente-side (antd `Table`) en todas las columnas salvo "Persona Contacto" (siempre `'—'`).
- Filtros por encabezado (antd `filters` + `onFilter`, cliente-side, valores dinámicos según la data ya cargada): Vendedor Asignado, Empresa, Etapa, Financiadora, Garantía, Financiamiento Paralelo.
- Notas: `width: 240` + `ellipsis: true` + `Tooltip` con el texto completo al hacer hover, para evitar desborde.
- Sigue sin llamadas nuevas a la API: todo el filtrado/orden es sobre el array ya obtenido por `useOportunidades`.
