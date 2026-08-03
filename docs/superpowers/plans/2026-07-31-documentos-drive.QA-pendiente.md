# QA manual pendiente — Documentos en Google Drive

Implementación completa y verificada estáticamente (`type-check` + `build` PASS). Lo que sigue **no se puede verificar sin navegador y backend real**, así que queda para una persona.

Levanta el entorno con `npm run dev` (arranca en `http://localhost:5173`) y recorre la lista en las dos pantallas: `/empresas/:id` y `/oportunidades/:id`.

---

## Consultas al backend — RESUELTAS (2026-07-31)

- [x] **1. ¿`drive_folder_id` viene en el payload real?** Sí. `EmpresaDetalleDto.driveFolderId` (`EmpresaDtos.kt:60`) se mapea en `toDetalle()`; `OportunidadDto.driveFolderId` (`OportunidadDtos.kt:46`) se mapea en `toDto()`, que es la que usa `detalle()`. Sale como `drive_folder_id` en el JSON. **Sin acción.**
- [x] **2. ¿Qué hace `POST /:id/archivos` con `drive_folder_id: null`?** **Crea la carpeta** ahí mismo (`asegurarCarpetaDrive`) y la persiste. El 404 solo ocurre si la entidad no existe o es ajena (`visible(id, usuario)`). El botón "Subir documento" habilitado en esos registros es correcto. **Ya cubierto**: `useSubirArchivo` invalida el detalle de la entidad tras cada subida, así que el botón "Abrir File" se habilita solo, sin F5.
- [x] **3. ¿MB decimales o MiB?** MiB — la constante del backend es `104_857_600L` = 100 × 1024 × 1024, idéntica a la del frontend. Y el framing del multipart **no cuenta** contra el límite: el backend mide el contenido ya desenmarcado (verificado con un test permanente, `DriveMultipartUploaderTest`). **No se reserva margen** — validar contra `file.size` es exacto.
- [x] **4. ¿`client_max_body_size` de nginx?** Premisa incorrecta: **no hay nginx** en este proyecto. El deploy es Render/Railway, que ponen su propio proxy de borde. Ver el punto pendiente de infraestructura abajo.

## Pendiente de infraestructura (no lo resuelve ni frontend ni backend)

- [ ] **A. Confirmar el límite de tamaño de body de la plataforma de deploy** (Render/Railway) con alguien que tenga acceso al panel. Es el único límite que ninguno de los dos repos controla.
- [ ] **B. Probar de punta a punta una subida real de ~100 MiB contra staging.** La prueba más grande hecha contra Drive real fue de 12 MB. Tomcat no tiene `server.tomcat.max-*` configurado; el backend cree que no aplica porque el endpoint lee el stream crudo, pero no está probado a ese tamaño.
  - Ya implementado en el frontend para este escenario: si el proxy corta la subida con un **413 sin envelope**, se muestra igualmente el mensaje específico de tamaño (`mensajeErrorSubida` mapea el status 413 aunque no haya `error.code`). Cualquier otro error sin envelope cae al mensaje genérico y **nunca** se lee `error.code` a ciegas.

---

## Checklist de UI

### Estados de la lista
- [ ] **5. Cargando** — al entrar se ve el `Skeleton` de 3 líneas antes de que llegue la respuesta.
- [ ] **6. Lista vacía** — en una entidad sin documentos se lee "No hay documentos todavía". Nunca un mensaje de error.
- [ ] **7. Lista con documentos** — ícono correcto por tipo: PDF → `picture_as_pdf`, imagen → `image`, Excel → `table`, Word → `description`, desconocido → `draft`. Se ve nombre y tamaño legible (p. ej. "277.8 KB").
- [ ] **8. Nombres largos** — se truncan con "…" en una sola línea y el nombre completo aparece en el tooltip al pasar el mouse.
- [ ] **9. Link del documento** — clic en el nombre abre Drive en **pestaña nueva**. Si hay algún archivo con `url: null`, su nombre se ve como texto plano, no clicable.

### Botón principal: "Abrir File" / "Crear File"
- [ ] **10. Con carpeta → "Abrir File..."** — va a `https://drive.google.com/drive/folders/{drive_folder_id}` en pestaña nueva. Texto exacto: "Abrir File del Cliente" en Empresa, "Abrir File de la Oportunidad" en Oportunidad. El botón "Crear File..." **no debe aparecer en absoluto**.
- [ ] **11. Sin carpeta → "Crear File..."** — en un registro con `drive_folder_id: null` se muestra "Crear File del Cliente" / "Crear File de la Oportunidad" en lugar de "Abrir File...". Si no hay un registro así a mano, fuérzalo pasando `driveFolderId={null}` en la página y revierte después.
- [ ] **12. Crear carpeta funciona sin recargar** — clic en "Crear File...": el botón muestra "Creando…" deshabilitado, aparece el toast "Carpeta creada en Drive" y el botón **cambia solo** a "Abrir File...". Sin F5.
- [ ] **13. Crear carpeta es idempotente** — haz doble clic rápido (o abre dos pestañas de la misma entidad y pulsa en ambas). No deben crearse carpetas duplicadas en Drive: el backend tiene lock propio, pero conviene confirmarlo de punta a punta.
- [ ] **14. Error al crear carpeta** — fuerza un 502: aparece el `Alert` bajo el botón con el mensaje de la tabla §22.3. Para `DRIVE_NO_DISPONIBLE` debe salir "Reintentar" y reintentar la creación.
- [ ] **15. Glyphs de íconos** — confirma que existen en la fuente Material Symbols cargada: `drive_folder_upload` (abrir), `create_new_folder` (crear), `folder_shared` (cabecera), `upload_file` y `progress_activity` (zona de subida). Si alguno falta, se ve el texto literal del nombre en vez del dibujo.

### Subida — clic
- [ ] **16. En curso** — la zona muestra "Subiendo…" y queda deshabilitada; un segundo intento durante ese estado no dispara una segunda subida.
- [ ] **17. Éxito** — aparece el toast "Documento subido" y el archivo aparece en la lista **sin recargar la página**.
- [ ] **18. Archivo > 100 MiB** — con DevTools → Network abierto, confirma que el cliente lo rechaza **sin emitir ningún POST**, mostrando "El archivo supera el tamaño máximo permitido (100 MB)". El umbral exacto son 104 857 600 bytes; un archivo de exactamente ese tamaño **debe pasar** la validación del cliente (el backend lo acepta).
- [ ] **19. Fallo** — fuerza un error del backend (o desconecta la red): el control se re-habilita y el mensaje corresponde a la tabla de §22.3 del contrato. Para `DRIVE_NO_DISPONIBLE` debe aparecer el botón "Reintentar", que reenvía el mismo archivo sin volver a seleccionarlo.
- [ ] **20. Multipart en Network** — inspecciona el POST a `/archivos`: el header `Content-Type` debe ser `multipart/form-data; boundary=----WebKitFormBoundary...` **generado por el navegador** (no `application/json`), y el payload debe tener un único campo llamado exactamente `file`.

### Subida — drag & drop
- [ ] **21. Estado visual al arrastrar** — al arrastrar un archivo por encima de la zona, esta cambia de aspecto (borde/fondo resaltado) antes de soltar.
- [ ] **22. Soltar sube el archivo** — soltar un documento lo sube igual que el clic: mismo toast, misma actualización de lista.
- [ ] **23. Varios archivos a la vez** — suelta 3 archivos de golpe: debe subirse **solo el primero**, sin errores ni subidas múltiples en Network.
- [ ] **24. Mismo manejo de errores por las dos vías** — repite el caso de archivo >100 MiB y el de error 502 **soltando** el archivo en vez de seleccionarlo. Los mensajes deben ser idénticos a los de la vía de clic (es la misma función de red, pero conviene confirmarlo).
- [ ] **25. Soltar fuera de la zona no navega** — arrastra un archivo y suéltalo en otra parte de la página. El navegador **no** debe abrir el archivo ni salir de la vista.

### Regresiones detectadas y corregidas en revisión — verificar que quedaron bien
- [ ] **18. Estado no se filtra entre entidades** — en `/empresas/7` provoca un error de subida hasta que aparezca "Reintentar". Sin recargar, navega a `/empresas/8`. La tarjeta "Documentos" de la 8 debe estar **limpia**: sin el error ni el botón "Reintentar" de la 7.
- [ ] **19. El botón se habilita tras la primera subida** — en un registro con `drive_folder_id: null`, sube un documento. El backend crea la carpeta en esa misma llamada (confirmado), así que el botón "Abrir File" debe **habilitarse solo**, sin F5, y su tooltip "Aún no hay documentos" debe desaparecer.
- [ ] **20. Coherencia visual en Oportunidad** — en `/oportunidades/:id`, la tarjeta "Documentos" debe tener el mismo radio de esquina y el mismo borde que "Contactos Relacionados" justo encima.
