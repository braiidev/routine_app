# GymRutina

App web móvil para registrar entrenamientos por fecha. La rutina semanal es una
**plantilla** (Lun–Dom, con modo completo o mínimo) y cada día entrenado genera
una **sesión independiente**. La app incluye historial semanal con los siete
días visibles, racha actual y mejor racha, edición de días pasados, respaldo
JSON y temporizador de descanso.

No usa build ni dependencias en tiempo de ejecución: HTML, CSS y módulos ES
nativos. Los datos viven en `localStorage` bajo la clave histórica
`gymrutina_state_v1`.

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

## Uso diario

### Hoy

- La tira semanal muestra los siete días de la semana actual. El día activo se
  distingue del resto y cada día puede tener un punto de estado.
- **Solo hoy permite marcar series** desde esta vista. La primera marca crea la
  sesión de la fecha; antes de eso se muestra la plantilla del día.
- Los días futuros se ven como **vista previa**: nombre, modo, notas y ejercicios
  con sus series, sin checks. Se pueden editar como plantilla desde el botón
  **Editar rutina**.
- Los días pasados se abren directamente en **Historial**.
- El temporizador de descanso solo se muestra cuando la pantalla activa es Hoy y
  la fecha seleccionada es la fecha actual.

### Modos y sesiones

- Una fecha tiene como máximo **una sesión** y un **único modo**: `completo` o
  `minimo`.
- El modo mínimo excluye los grupos marcados como opcionales y puede usar nombre
  o cantidad de series propios por ejercicio.
- Cambiar de modo después de marcar series pide confirmación y **reinicia la
  sesión de esa fecha**. Si la sesión estaba completa, el cambio también afecta
  el historial y la racha.
- Reiniciar la sesión de hoy borra sus checks. Si queda vacía, deja de figurar
  como sesión. La plantilla no cambia.
- La sesión guarda una foto de los ejercicios y series del momento en que se
  creó. Editar la plantilla después no altera sesiones pasadas.

### Historial y racha

- El historial muestra tarjetas semanales con **los siete días**, incluidos los
  vacíos, agrupadas por mes. Empieza con ocho semanas y permite cargar más.
- Al tocar un día se abre su detalle. Un día pasado sin registro se puede
  **registrar** con la plantilla actual. Un día con sesión se puede **corregir**
  sin modificar la plantilla.
- El día de hoy se consulta en Historial, pero sus checks se editan desde Hoy.
- La **racha actual** cuenta días consecutivos completos (`full`) o mínimos
  (`min`). Si hoy todavía no está completo, la racha espera y se cuenta desde
  ayer; un día parcial o vacío en el medio la corta.
- La **mejor racha** es la mayor seguidilla de días `full`/`min` hasta hoy.
- El estado se deriva de la sesión: no se guarda un contador de racha aparte.

### Menú FAB

- **Editar rutina**: abre la plantilla del día que se está viendo (Hoy o
  Historial). En el editor se cambian el nombre del día, el modo por defecto, las
  notas, los grupos y los ejercicios; se puede reordenar, duplicar y eliminar con
  opción de deshacer.
- **Exportar datos**: descarga un JSON v3 con plantilla y sesiones.
- **Importar datos**: reemplaza plantilla y sesiones, con confirmación y copia
  previa.
- **Reiniciar sesión…**: borra solo la sesión de hoy, con confirmación.

## Datos y migración

### Esquema v3

```json
{
  "schemaVersion": 3,
  "template": {
    "Lun": {
      "title": "Lun",
      "defaultMode": "completo",
      "notes": "Pecho y tríceps.",
      "groups": [
        {
          "id": "d1-g1",
          "name": "Pecho",
          "optional": false,
          "items": [
            {
              "id": "d1-i1",
              "name": "Press banca",
              "steps": 4,
              "minName": null,
              "minSteps": null
            }
          ]
        }
      ]
    }
  },
  "sessions": {
    "2026-10-26": {
      "date": "2026-10-26",
      "day": "Lun",
      "mode": "completo",
      "groups": [
        {
          "id": "d1-g1",
          "name": "Pecho",
          "optional": false,
          "items": [
            { "id": "d1-i1", "text": "Press banca", "steps": 4, "done": 4 }
          ]
        }
      ]
    }
  }
}
```

- `template` no guarda progreso ni historial.
- `sessions` está indexado por fecha ISO local (`YYYY-MM-DD`).
- Cada item de sesión guarda `text`, `steps` y `done`.
- El estado de una sesión es derivado: `empty`, `partial`, `full` o `min`; no se
  persiste un campo de estado.
- `gymrutina_last_active_date` ya no se usa en el funcionamiento normal. Queda
  solo para migrar el progreso v2 de la última fecha activa.

### Migración desde v1/v2

La app lee el formato viejo en `gymrutina_state_v1` o, como respaldo, en la clave
legada `rutina_builder_v2`. Antes de normalizar:

- guarda el JSON crudo en
  `gymrutina_state_v1_backup_pre_v3_<timestamp>` (o en la clave legada si vino de
  allí);
- si el JSON es ilegible, lo conserva en `<clave>_corrupt_<timestamp>`;
- si la versión es futura, conserva una copia en
  `<clave>_backup_future_vN_<timestamp>` antes de normalizar.

Los logs v1/v2 se convierten en sesiones por fecha. Si hay más de un registro
para la misma fecha se conserva el mejor según `full > min > partial` y, a
igualdad de estado, el que tenga más series hechas. El progreso vigente de la
última fecha activa se agrega como sesión de ese día si tiene series marcadas.
La plantilla vieja se migra sin checks ni logs; los overrides de mínimo se
mantienen.

## Exportar e importar

La exportación usa el esquema v3 e incluye `app`, `schemaVersion`, `exportedAt`,
`template` y `sessions`. La importación:

- acepta archivos v3, v2 y v1;
- exige los siete días de plantilla y rechaza esquemas futuros;
- reemplaza toda la rutina y el historial;
- guarda una copia del estado actual en
  `gymrutina_state_v1_backup_pre_import_<timestamp>`;
- al importar v2, el progreso vigente se interpreta como una sesión de la fecha
  de importación cuando no hay un log para ese día.

## Semilla de ejemplo

`seeds/gymrutina-demo.json` es una exportación v3 con:

- 7 días, 16 grupos y 36 ejercicios;
- 37 sesiones entre agosto y octubre de 2026, sin fechas duplicadas ni el día
  actual;
- 20 sesiones completas, 7 mínimas y 10 parciales.

`seeds/gymrutina-demo-v2.json` conserva la semilla v2 anterior como fixture de
compatibilidad. También se puede importar.

```bash
npm run seed
```

El generador es `scripts/build-demo-seed.mjs`.

## Estructura

```text
index.html
css/
  main.css
  tokens.css
  base.css
  components.css
js/
  app.js
  config.js
  icons.js
  state/
    schema.js       esquema v3 y estado inicial
    normalize.js    normalización y migración v1/v2 -> v3
    store.js        carga, respaldo, persistencia y reemplazo
    selectors.js    sesiones, resumen y rachas
    view.js         pantalla, fecha y estado efímero de UI
  features/
    sessions.js     creación de sesiones, checks, modos y reset
    actions.js      navegación, plantilla y acciones de sesión
    backup.js       exportación, importación y resumen
    timer.js        temporizador de descanso
  ui/
    render.js       Hoy, editor, tira semanal y navegación
    history.js      historial semanal, detalle y edición retroactiva
    groups.js       editor, sesión y vista previa
    menu.js         menú FAB
    reset.js        hoja de reinicio
    backup.js       descarga y confirmación de importación
    toast.js        avisos flotantes
  utils/
    date.js         fechas ISO locales, semanas y meses
    dom.js          escape HTML e IDs
    time.js         formato y cálculo del temporizador
scripts/
  test.mjs
  check.mjs
  bump.mjs
  build-demo-seed.mjs
seeds/
  gymrutina-demo.json
  gymrutina-demo-v2.json
  README.md
TODO.md
VERSION
```

## Flujo de datos

1. `boot()` registra el aviso de almacenamiento, carga el estado y enlaza la
   delegación de eventos.
2. `load()` lee `localStorage`, migra si hace falta, guarda la copia previa y
   persiste el estado normalizado v3.
3. El primer check de una fecha crea una sesión con la plantilla y el modo
   elegido; los cambios posteriores se guardan en `sessions[date]`.
4. `render()` vuelve a dibujar la pantalla activa. El editor modifica solo
   `state.template`.
5. Al volver a la app o cambiar de día, `syncToday()` actualiza la fecha de la
   vista. No hay archivo de rollover ni progreso persistido por día de semana.

## Desarrollo

```bash
npm test          # 40 pruebas de estado, migración, sesiones, historial y UI
npm run check     # VERSION <-> package.json <-> TODO.md <-> último commit
npm run serve     # servidor estático en :8000
npm run seed      # regenera la semilla v3
```

`npm run check` compara la versión con el último commit; después de un cambio
sin commit puede fallar a propósito hasta hacer el commit de la fase.

## Verificación manual sugerida

1. Servir por HTTP y comprobar que `index.html`, CSS y módulos cargan sin errores
   en la consola.
2. Migrar un estado v2 y confirmar la copia cruda en `localStorage`, las 37
   fechas y los estados completo/mínimo/parcial.
3. Marcar series hoy hasta completar; verificar que se crea una sola sesión y que
   cambiar de modo pide confirmación.
4. Abrir un día futuro, comprobar que no hay checks y editar la plantilla.
5. En Historial, comprobar las siete columnas, los días vacíos, el detalle, la
   edición de un día pasado y la racha.
6. Probar exportación, importación de la semilla v3 y reinicio de hoy.
7. Revisar en el teléfono el menú FAB, la tira semanal, el temporizador y los
   avisos flotantes.

## Límites actuales

- PWA, manifest, service worker y uso offline quedan para `v0.10.0`.
- Estadísticas ampliadas de cumplimiento quedan para `v0.11.0`.
- No hay vista de calendario por diseño: la navegación es por tira semanal,
  tarjetas semanales y selector de fecha.
- Varias pestañas abiertas pueden pisarse; la última escritura gana.
- El temporizador vive en la página y no se muestra fuera de la vista Hoy del día
  actual.

## Convenciones y versionado

- Cada fase se documenta en `TODO.md` con una descripción atómica y un tablero.
- `VERSION` y `package.json` deben coincidir con el último commit.
- Los commits usan el prefijo `Vx.y.Z:` y el hito se marca con `git tag vX.Y.Z`.
- La app mantiene la clave `gymrutina_state_v1` por compatibilidad; la versión
  real del formato está en `schemaVersion`.
