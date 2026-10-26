# GymRutina

App web móvil para registrar y seguir una rutina de gimnasio. Tiene siete días
(Lun–Dom), dos modos de entrenamiento (completo y mínimo), progreso por series,
historial de días completados y un temporizador de descanso.

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
- **Modo Completo / Mínimo**: cada ítem tiene texto y series propios por modo. En
  modo mínimo se ocultan los grupos marcados como opcionales.
- **Progreso**: tocá el texto del ítem para sumar una serie, o un punto para fijar
  el progreso. Si el día queda completo se registra en el historial.
- **Menú (FAB)**:
  - *Editar día*: edición de título, instrucciones, grupos e ítems. Los cambios se
    guardan al salir del campo; *Terminar edición* cierra la edición.
  - *Ver historial*: línea de tiempo de días completados; tocá un punto para ver el
    detalle.
  - *Exportar rutina*: descarga un JSON con toda la rutina.
  - *Importar rutina*: reemplaza la rutina actual desde un JSON exportado, con
    confirmación y copia de seguridad previa.
  - *Reiniciar checks del día*: pide confirmación y limpia el progreso del día en el
    modo actual.
- **Temporizador**: presets de 30/40/60/90 s, tiempo personalizado (hasta 3600 s),
  pausa/reanudar y reset. Al terminar suena, vibra y parpadea.

## Datos y migración

- Clave actual: `gymrutina_state_v1`, con el formato:

  ```json
  { "schemaVersion": 1, "days": { "Lun": { "title": "Lun", "mode": "completo", "notes": "", "groups": [], "log": [] } } }
  ```

- Clave anterior: `rutina_builder_v2`. Al cargar, si no existe la clave nueva, se
  migra automáticamente y **la clave vieja se conserva como respaldo**.
- Los datos se normalizan al leer: días faltantes, ids duplicados, pasos inválidos,
  progreso fuera de rango y entradas de historial con fechas rotas.
- Si la clave nueva tiene JSON ilegible, se guarda una copia en
  `gymrutina_state_v1_corrupt_<timestamp>` antes de continuar.
- Para borrar todo: DevTools → Application → Local Storage → eliminar las claves.

## Respaldo y restauración

- **Exportar rutina** (menú FAB) genera `gymrutina-YYYY-MM-DD.json` con:

  ```json
  { "app": "gymrutina", "schemaVersion": 1, "exportedAt": "...", "days": { "Lun": {} } }
  ```

- **Importar rutina** acepta ese archivo o el formato viejo (mapa de días sin
  `schemaVersion`). Valida que estén los siete días, normaliza los datos y muestra un
  resumen antes de reemplazar.
- Antes de importar guarda el estado actual en
  `gymrutina_state_v1_backup_pre_import_<timestamp>`. El nombre exacto queda en la
  consola; se puede restaurar copiando ese valor a `gymrutina_state_v1`.
- Rechaza JSON roto, archivos incompletos y exportaciones de un esquema más nuevo.
- Importar reemplaza toda la rutina: no fusiona días ni grupos.

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
│   │   ├── store.js      # Carga, guardado, commit y notificación
│   │   ├── selectors.js  # Cálculos derivados (progreso, fin de día)
│   │   └── view.js       # Estado de UI (día activo, modo edición, pendientes)
│   ├── features/
│   │   ├── actions.js    # Mutaciones del estado
│   │   ├── backup.js     # Export/import JSON: validación y resumen
│   │   └── timer.js      # Cronómetro, audio, vibración, visibilidad
│   ├── ui/
│   │   ├── render.js     # Render de tabs y del día
│   │   ├── groups.js     # Grupos, ítems y notas
│   │   ├── history.js    # Historial y detalle
│   │   ├── backup.js     # Descarga e importación desde el menú
│   │   ├── toast.js      # Avisos flotantes con acción opcional
│   │   └── menu.js       # FAB y cierre del menú
│   └── utils/
│       ├── dom.js        # esc, escAttr, uid
│       ├── date.js       # Fechas locales (YYYY-MM-DD)
│       └── time.js       # Formato MM:SS y deadline del timer
├── scripts/
│   ├── test.mjs          # Pruebas de estado, migración y tiempo
│   ├── bump.mjs          # Sube la versión
│   └── check.mjs         # Verifica coherencia del proyecto
├── TODO.md               # Descripción, estado, tablero y notas
├── VERSION               # Fuente de verdad de la versión
└── package.json          # Versión espejo, scripts y metadatos
```

### Flujo de datos

```text
acción del usuario
  → delegación en app.js (data-action / data-edit)
  → features/actions.js muta el estado
  → store.commit() guarda en localStorage y notifica
  → ui/render.js vuelve a pintar tabs y día
```

No hay frameworks ni reactividad: el estado se guarda y se re-renderiza a mano.

## Desarrollo

```bash
npm test        # 27 pruebas de estado, migración, respaldo y tiempo
npm run check   # VERSION ↔ package.json ↔ TODO.md ↔ último commit
npm run bump -- patch   # v0.4.1 -> v0.4.2 (también minor / major)
npm run serve   # servidor estático en :8000
```

No hace falta instalar nada: los scripts usan Node puro.

### Convenciones

- Toda mutación del estado pasa por `js/features/actions.js` y termina en
  `commit()`. No modificar `localStorage` desde la UI.
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

## Versionado

El proyecto sigue Project Flow: cada commit lleva `vX.Y.Z` y lista los archivos
tocados; `git log` es la bitácora y `git tag` marca cada fase cerrada. La versión
vigente está en `VERSION`; `package.json` y `TODO.md` son copias derivadas que
`scripts/bump.mjs` mantiene sincronizadas. `npm run check` detecta incoherencias.

## Límites conocidos y próximos pasos

- El progreso de cada día persiste hasta que se reinicia a mano; no se reinicia
  automáticamente al cambiar de fecha. Es intencional: el reinicio es explícito.
- El historial guarda como máximo una entrada por día y modo.
- El audio del temporizador requiere una interacción previa (política de
  navegadores móviles); la vibración y el parpadeo funcionan igual.
- Sin export/import JSON, sin estadísticas semanales y sin PWA/offline por ahora.
  Son candidatas naturales para las próximas fases.
