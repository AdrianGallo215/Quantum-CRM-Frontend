# Modal de datos de contacto en OportunidadDetalle

- Archivo: `src/pages/OportunidadDetalle/ContactosCard.tsx`
- Cambio: click en la tarjeta de un contacto vinculado abre un `Modal` de Ant Design (`contactoActivo`, `Modal title="Datos del contacto"`) de solo lectura.
- Datos mostrados: `nombres`, `apellidos`, `cargo`, `rol_en_oportunidad`, `es_principal`, `toma_decision`, `tlf_1` (`tel:`), `email_1` (`mailto:`).
- Fuente de datos: `o.contactos` (`ContactoEnOportunidad`) + `datosDe(id)` sobre `empresa.data.contactos` (`ContactoEnEmpresa`). Sin nueva llamada a la API, sin cambios en `src/api/contactos.ts` ni en `src/types`.
- Botones internos de la tarjeta (`tel:`, `mailto:`, desvincular) usan `onClick={(e) => e.stopPropagation()}` para no abrir el modal.
- Cierre: `footer={null}` + `onCancel`, sin acción de guardado.
