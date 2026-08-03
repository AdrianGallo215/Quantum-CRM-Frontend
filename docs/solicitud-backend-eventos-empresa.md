# Solicitud al equipo de backend — Eventos a nivel de Empresa

> Estado: **pendiente de implementar en el backend**. El frontend ya está cableado contra este contrato (ver `src/api/eventos.ts` y `src/hooks/useEventosTareas.ts`) pero las llamadas fallarán con 404 hasta que estos endpoints existan. No se modifica `contrato_api.md` unilateralmente — este documento es la solicitud formal, a incorporar ahí por el equipo de backend cuando se implemente.

---

## Contexto / por qué se necesita

`GET /prospeccion` calcula `checkpoints_completados` contando eventos con `es_hito_prospeccion = true` y `estado = 'ocurrido'` vinculados a la empresa **sin** `id_oportunidad` (contrato_api.md §16). Hoy el contrato solo expone:

- `GET /oportunidades/:id/eventos`
- `POST /oportunidades/:id/eventos`

Ambos exigen una oportunidad. No existe forma de que el vendedor registre esos hitos de prospección (Reporte Tributario recibido, Sentinel positivo, Reunión inicial realizada) **antes** de que exista una oportunidad — que es exactamente el momento en que se necesitan, porque `GET /prospeccion` solo devuelve empresas con `estado_cartera = 'prospeccion'` (sin oportunidad activa). Sin este endpoint, el % de avance de prospección nunca puede subir desde la UI.

---

## 1. `GET /empresas/:id/eventos`

> Lista los eventos de una empresa que no están vinculados a ninguna oportunidad (`id_oportunidad IS NULL`).

**Roles:** todos (mismo filtro automático por rol que el resto de endpoints de `/empresas`)

**Respuesta 200** — mismo shape que `GET /oportunidades/:id/eventos`:

```json
{
  "data": {
    "pendientes": [
      {
        "id": 12,
        "id_catalogo_evento": 9,
        "nombre": "Reporte Tributario recibido",
        "es_personalizado": false,
        "descripcion": null,
        "estado": "pendiente",
        "fecha_estimada": "2026-07-15",
        "fecha_seguimiento": "2026-07-10",
        "fecha_ocurrencia": null,
        "dispara_cambio_estado": false,
        "estado_destino": null,
        "es_recomendado": true,
        "es_hito_prospeccion": true,
        "etapa_asociada": null
      }
    ],
    "ocurridos": [],
    "descartados": []
  }
}
```

**Cambio pedido sobre el shape actual:** agregar el campo `es_hito_prospeccion` (boolean) al objeto evento — hoy solo vive en `catalogo-eventos`, no se refleja en la instancia. Sin él, el frontend no puede mostrar el badge "Hito de prospección" ni explicar por qué un evento cuenta para el %.

---

## 2. `POST /empresas/:id/eventos`

> Registra un nuevo evento en la empresa, sin oportunidad asociada.

**Roles:** todos (solo su empresa si es vendedor/analista — mismo filtro que `PATCH /empresas/:id/estado-cartera`)

**Body (evento del catálogo)** — idéntico al de oportunidades:
```json
{
  "id_catalogo_evento": 9,
  "fecha_estimada": "2026-07-15",
  "fecha_seguimiento": "2026-07-10",
  "descripcion": null
}
```

**Body (evento personalizado)** — idéntico al de oportunidades:
```json
{
  "es_personalizado": true,
  "nombre_personalizado": "Visita a cochera",
  "fecha_estimada": "2026-07-16",
  "fecha_seguimiento": null,
  "descripcion": "Confirmar capacidad de flota en sede Ate"
}
```

**Respuesta 201:** el evento creado, con `id_empresa` seteado e `id_oportunidad = null`.

**Notas:**
- Si `id_catalogo_evento` referencia un evento con `etapa_asociada` no nula (es decir, propio de una etapa del pipeline), el backend debe rechazar con `400 VALIDACION` — ese evento pertenece a una oportunidad, no a una empresa suelta.

---

## 3. Reutilización de endpoints existentes (confirmar, no crear)

Estos ya existen y operan por `id` de evento, sin importar su padre — pedimos **confirmar** que ya soportan eventos con `id_oportunidad = NULL` sin cambios:

- `PATCH /eventos/:id/ocurrido`
- `PATCH /eventos/:id/descartado`
- `PUT /eventos/:id`

Para eventos de empresa, `sugerencia` en la respuesta de `PATCH /eventos/:id/ocurrido` debe venir siempre `null` (no hay `estado` de oportunidad que sugerir cambiar).

---

## 4. Sugerencia opcional — `catalogo-eventos`

Para que el selector de "evento del catálogo" en el modal de creación a nivel empresa muestre solo las opciones pertinentes, sería útil un flag explícito `aplica_a_empresa: boolean` en `GET /catalogo-eventos`. **Mientras no exista**, el frontend filtra provisionalmente por `etapa_asociada === null || es_hito_prospeccion === true` — ES UNA HEURÍSTICA DEL FRONTEND, no autoritativa; agradecemos que el backend confirme si ese criterio es correcto o si prefiere exponer el flag.

---

## No rompe nada existente

- No modifica ningún endpoint ya implementado.
- No cambia la tabla `oportunidad_estados_log` ni la lógica de `actualizarEstadoCartera`.
- Es aditivo: dos rutas nuevas + un campo nuevo en un shape ya existente.
