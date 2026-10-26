# GymRutina

App web móvil para registrar y seguir una rutina de gimnasio. Tiene siete días
(Lun–Dom), dos modos de entrenamiento (completo y mínimo), progreso por series,
historial de días completos y parciales y un temporizador de descanso. El editor pide un solo
nombre y una sola cantidad de series por ejercicio; el modo mínimo puede usar valores
propios solo cuando hace falta. Los grupos y ejercicios se pueden reordenar y duplicar,
y un borrado se deshace desde el aviso flotante. Al cambiar la fecha, el progreso
anterior se archiva en el historial y los checks se limpian.

No usa build ni dependencias en tiempo de ejecución: HTML, CSS y módulos ES
nativos. Los datos viven en `localStorage`.

## Cómo usarla

La app necesita servirse por HTTP porque usa módulos ES (`import`) y `@import` de
CSS. Abrir `index.html` con `file://` no funciona.

```bash
# desde la raíz del proyecto
python -m http.server 8000
# o
npx live-server --port=8000
```

Después abrí <http://localhost:8000>. También podés apuntar cualquier servidor
estático, como HTTP.serve, a esta carpeta.

### Uso diario

- **Tabs**: cambiá de día.
- **Modo Completo / Mínimo**: cada ejercicio tiene un nombre y una cantidad de series
  compartidos. Un ejercicio puede definir valores propios para el modo mínimo y los
  grupos marcados como opcionales se ocultan en ese modo.
- **Progreso**: usá `−` / `+` o tocá el nombre del ejercicio para sumar una serie. La
  barra inferior muestra el avance. Si el día queda completo se registra en el
  historial; si no, al cambiar la fecha se archiva como parcial.
- **Reinicio diario**: al abrir la app o volver a ella, si la fecha cambió, se archiva
  el progreso anterior una sola vez y se limpian los checks de todos los días. No hay
  reinicio a medianoche mientras la app queda abierta y enfocada.
- **Menú (FAB)**:
  - *Editar día*: abre el editor. El banner **Editando** avisa que los cambios se
    guardan solos; **Listo** cierra la edición.
  - *Ver historial*: línea de tiempo agrupada por mes, con estados completo, mínimo y
    parcial; tocá un punto para ver el detalle.
  - *Exportar rutina*: descarga un JSON con toda la rutina.
  - *Importar rutina*: reemplaza la rutina actual desde un JSON exportado, con
    confirmación y copia de seguridad previa.
  - *Reiniciar día…*: abre una hoja para limpiar solo el modo actual o ambos; el
    historial no se borra.
- **Edición**:
  - **Ejercicio** y **Series** son los únicos campos visibles. El stepper de series
    permite ajustar de 1 a 100.
  - Las flechas ↑/↓ reordenan grupos y ejercicios; **Duplicar** crea una copia con
    ids nuevos y el progreso en cero.
  - **Eliminar** actúa al instante. El aviso **Deshacer** restaura el grupo o
    ejercicio en su posición original durante unos segundos.
  - **Personalizar modo mínimo** es una sección plegable: al activar *Usar nombre y
    series propios* aparece el override de ese ejercicio.
  - **Opcional** se activa con un interruptor visible y una ayuda que explica que el
    grupo se oculta en modo mínimo.
  - La fila **Agregar ejercicio…** crea el ítem con el nombre escrito y deja el foco
    listo para el siguiente; **Agregar grupo…** hace lo mismo con los grupos. Enter
    confirma el alta.
- **Temporizador**: presets de 30/40/60/90 s, campo **Segundos** con **Aplicar** (hasta
  3600 s), pausa/reanudar y reset. Al terminar suena, vibra y parpadea; el audio se
  prepara al tocar Iniciar.

## Datos y migración

- Clave actual: `gymrutina_state_v1` (el nombre se conserva por compatibilidad; la
  versión real está dentro del archivo), con el formato:

  ```json
  {
    "schemaVersion": 2,
    "days": {
      "Lun": {
        "title": "Lun",
        "mode": "completo",
        "notes": "",
        "groups": [
          {
            "id": "g1",
            "name": "Pecho",
            "optional": false,
            "items": [
              {
                "id": "i1",
                "name": "Press banca",
                "steps": 4,
                "minName": null,
                "minSteps": null,
                "progress": { "completo": 0, "minimo": 0 }
              }
            ]
          }
        ],
        "log": []
      }
    }
  }
  ```

- `name` y `steps` son los valores por defecto para ambos modos. `minName` y
  `minSteps` en `null` significan "usar el mismo valor"; si tienen un valor, el modo
  mínimo usa ese override.
- Clave de control diario: `gymrutina_last_active_date` guarda la última fecha local
  `YYYY-MM-DD`. Al cargar o volver a la app, `features/rollover.js` compara esa fecha
  con hoy, archiva el progreso anterior como completo/mínimo/parcial y limpia los
  checks. Se guarda aparte del estado para no cambiar el esquema.
- El historial de cada día es una lista de entradas `{ date, mode, items, status }`.
  `status` puede ser `full`, `min` o `partial`; las entradas parciales se crean al
  cambiar de fecha y no se duplican si ya existe una para esa fecha y modo.
- Clave anterior: `rutina_builder_v2`. Al cargar, si no existe la clave nueva, se
  migra automáticamente y **la clave vieja se conserva como respaldo**.
- Migración v1 → v2: `name = textCompleto`, `steps = stepsCompleto`; el override
  mínimo solo se completa si `textMinimo` o `stepsMinimo` difieren del completo. El
  progreso se conserva y se recorta a los límites resultantes.
- Los datos se normalizan al leer: días faltantes, ids duplicados, pasos inválidos,
  progreso fuera de rango y entradas de historial con fechas rotas.
- Si la clave nueva tiene JSON ilegible, se guarda una copia en
  `gymrutina_state_v1_corrupt_<timestamp>` antes de continuar.
- El respaldo JSON no incluye `gymrutina_last_active_date`: es una fecha local y se
  inicializa al abrir en un dispositivo nuevo.
- Para borrar todo: DevTools → Application → Local Storage → eliminar las claves
  `gymrutina_state_v1` y `gymrutina_last_active_date`.

## Respaldo y restauración

- **Exportar rutina** (menú FAB) genera `gymrutina-YYYY-MM-DD.json` con:

  ```json
  { "app": "gymrutina", "schemaVersion": 2, "exportedAt": "...", "days": { "Lun": {} } }
  ```

- **Importar rutina** acepta ese archivo, exportaciones v1 o el formato viejo (mapa
  de días sin `schemaVersion`). Valida que estén los siete días, normaliza los datos
  y migra los ítems al esquema v2 antes de mostrar el resumen y reemplazar.
- Antes de importar guarda el estado actual en
  `gymrutina_state_v1_backup_pre_import_<timestamp>`. El nombre exacto queda en la
  consola; se puede restaurar copiando ese valor a `gymrutina_state_v1`.
- Rechaza JSON roto, archivos incompletos y exportaciones de un esquema más nuevo.
- Importar reemplaza toda la rutina: no fusiona días ni grupos.

### Datos de ejemplo

`seeds/gymrutina-demo.json` es una exportación lista para importar: rutina de 7
días, 16 grupos, 36 ejercicios y 37 registros de historial entre agosto y octubre
de 2026, con los estados `full`, `min` y `partial`. Incluye progreso parcial en
algunos días y no registra el día de hoy, para poder probar el historial y el
cierre diario al usarla.

Importala desde **Importar rutina**; el proceso reemplaza la rutina actual y
guarda la copia previa de siempre. `npm run seed` regenera el archivo con
`scripts/build-demo-seed.mjs`.

## Estructura

```text
.
├── index.html            # Estructura de la pantalla
├── favicon.svg
├── css/
│   ├── main.css          # Punto de entrada (@import)
│   ├── tokens.css        # Variables y temas claro/oscuro
│   ├── base.css          # Reset y layout
│   └── components.css    # Tabs, grupos, ítems, timer, FAB, historial
├── js/
│   ├── app.js            # Arranque y delegación de eventos
│   ├── config.js         # Claves de storage, días, límites
│   ├── icons.js          # SVGs y helper icon()
│   ├── state/
│   │   ├── schema.js     # Versión de esquema y estado por defecto
│   │   ├── normalize.js  # Validación y migración de datos
│   │   ├── store.js      # Carga, guardado, commit y aviso de errores
│   │   ├── selectors.js  # Cálculos derivados (progreso, fin de día)
│   │   └── view.js       # Estado de UI (día activo, edición, historial)
│   ├── features/
│   │   ├── actions.js    # Mutaciones del estado
│   │   ├── backup.js     # Export/import JSON: validación y resumen
│   │   ├── rollover.js   # Cambio de fecha, archivo de parciales y limpieza
│   │   └── timer.js      # Cronómetro, audio, vibración, visibilidad
│   ├── ui/
│   │   ├── render.js     # Render de tabs y del día
│   │   ├── groups.js     # Grupos, ítems y notas
│   │   ├── history.js    # Historial y detalle
│   │   ├── backup.js     # Descarga e importación desde el menú
│   │   ├── reset.js      # Hoja de reinicio por modo
│   │   ├── toast.js      # Avisos flotantes con acción opcional
│   │   └── menu.js       # FAB, aria-expanded y cierre del menú
│   └── utils/
│       ├── dom.js        # esc, escAttr, uid
│       ├── date.js       # Fechas locales (YYYY-MM-DD)
│       └── time.js       # Formato MM:SS y deadline del timer
├── scripts/
│   ├── test.mjs          # Pruebas de estado, rollover, migración, respaldo, editor y tiempo
│   ├── build-demo-seed.mjs # Genera la exportación de ejemplo
│   ├── bump.mjs          # Sube la versión
│   └── check.mjs         # Verifica coherencia del proyecto
├── seeds/
│   ├── gymrutina-demo.json # Exportación con tres meses de historial
│   └── README.md         # Cómo importar y regenerar los datos de ejemplo
├── TODO.md               # Descripción, estado, tablero y notas
├── VERSION               # Fuente de verdad de la versión
└── package.json          # Versión espejo, scripts y metadatos
```

### Flujo de datos

```text
acción del usuario
  → delegación en app.js (data-action / data-edit / data-form)
  → features/actions.js muta el estado
  → store.commit() guarda en localStorage y notifica
  → ui/render.js vuelve a pintar tabs y día
```

Los campos de texto usan `store.save()` sin notificar: el input ya muestra lo que se
escribió y así no se pierde el foco al pasar de un campo a otro. Las acciones
estructurales (alta, borrado, cambio de modo) usan `commit()` y vuelven a pintar.

El cierre diario sigue este camino:

```text
arranque, visibilitychange, pageshow o focus
  → features/rollover.js compara lastActiveDate con hoy
  → archiva el progreso anterior por día y modo (sin duplicados)
  → limpia los checks y setLastActiveDate(hoy)
  → commit() si hubo cambios
```

No hay frameworks ni reactividad: el estado se guarda y se re-renderiza a mano.

## Desarrollo

```bash
npm test        # 50 pruebas de estado, rollover, migración, respaldo, editor y tiempo
npm run check   # VERSION ↔ package.json ↔ TODO.md ↔ último commit
npm run bump -- patch   # sube el patch (también minor / major)
npm run seed    # regenera seeds/gymrutina-demo.json
npm run serve   # servidor estático en :8000
```

No hace falta instalar nada: los scripts usan Node puro.

### Convenciones

- Toda mutación del estado pasa por `js/features/actions.js` o, para el cierre diario,
  por `js/features/rollover.js`. Usá `commit()` cuando la UI deba repintarse y `save()`
  para campos de texto que ya reflejan el valor. No modificar `localStorage` desde la UI.
- Los cálculos derivados viven en `state/selectors.js`.
- Las acciones del DOM se declaran con `data-action` y se manejan en el mapa de
  `app.js`. Los campos editables usan `data-edit`. No agregar `onclick` inline.
- Todo texto del usuario se interpola con `esc()` o `escAttr()` (atributos).
- Los límites y claves están en `js/config.js`.
- Si cambia la forma de los datos, subí `SCHEMA_VERSION` en `state/schema.js`,
  agregá la normalización en `state/normalize.js` y un caso en `scripts/test.mjs`.

### Cómo agregar una feature

1. Anotarla en `TODO.md` bajo `### Siguiente` con su versión `vX.Y.0` reservada.
2. Agregar la acción en `features/actions.js` (y el selector si hace falta).
3. Pintar la UI en `ui/` usando `data-action`/`data-edit`.
4. Enlazar la acción en el mapa de `app.js`.
5. Agregar pruebas en `scripts/test.mjs`.
6. `npm test`, `npm run check`, commit `vX.Y.Z` y tag al cerrar la fase.

### Checklist manual de UI

La suite automática cubre la lógica; esta lista cubre lo que necesita ojos y oído. Se
ejecuta en el teléfono o en un navegador con la app servida por HTTP.

- [ ] Claro/oscuro: tabs, tarjetas, banner de edición, toast y hoja de reinicio.
- [ ] Edición: alta de grupo/ejercicio, override mínimo, opcional, flechas, duplicar,
      borrar y **Deshacer**.
- [ ] Uso: `−` / `+` de series, toque en el nombre, cambio de modo y reinicio del modo
      actual o de ambos.
- [ ] Historial: agrupación por mes, puntos, detalle y nombres accesibles con lector de
      pantalla.
- [ ] Reinicio diario: cambiar la fecha del sistema, volver a la app y comprobar que se
      archiva el día anterior una sola vez y los checks quedan en cero.
- [ ] Timer: preset, **Segundos** / **Aplicar**, Iniciar/Pausar/Reanudar/Reset, audio y
      vibración.
- [ ] Respaldo: exportar, importar, cancelar y error de archivo.
- [ ] Móvil: ancho de 320 px, objetivos táctiles de 44 px, teclado y foco visible.

## Versionado

El proyecto sigue Project Flow: cada commit lleva `vX.Y.Z` y lista los archivos
tocados; `git log` es la bitácora y `git tag` marca cada fase cerrada. La versión
vigente está en `VERSION`; `package.json` y `TODO.md` son copias derivadas que
`scripts/bump.mjs` mantiene sincronizadas. `npm run check` detecta incoherencias.

## Límites conocidos y próximos pasos

- El reinicio diario se evalúa al cargar, al volver a la pestaña y al recuperar foco.
  No hay temporizador de medianoche: si la app queda abierta y enfocada, los checks se
  reinician en la próxima vuelta.
- Varias pestañas abiertas no están sincronizadas; cada una detecta el cambio de fecha
  al volver a estar visible.
- El historial guarda como máximo una entrada por día, fecha y modo. Los parciales se
  archivan al cambiar de fecha; el reinicio manual no crea entradas.
- El audio del temporizador se desbloquea al tocar Iniciar; si el navegador igual lo
  bloquea, la vibración y el parpadeo funcionan sin sonido.
- Sin estadísticas semanales ni PWA/offline por ahora. Son candidatas naturales para
  las próximas fases.
