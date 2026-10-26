# TODO - GymRutina

## Descripcion

GymRutina es una app web móvil en HTML/JS/CSS para registrar y seguir rutinas de gimnasio con modos completo/mínimo, historial de finalizaciones y temporizador de descanso. Se construye sobre un único archivo index.html con localStorage. Consta de tabs por día, grupos de ejercicios, progreso por series, historial diario y cronómetro. Está terminado cuando la app funciona modularizada en archivos separados (html, css, js), mantiene compatibilidad con los datos existentes en localStorage, se puede servir con HTTP.serve y resulta más mantenible para añadir features y depurar errores.

## Estado

- Version actual: `v0.1.0`
- Fase en curso: Fase 1 - Modularizar CSS y JavaScript
- Siguiente version reservada: `v0.2.0`

## Tablero

### En curso

- [ ] **v0.1.0** - Fase 1 - Modularizar CSS y JavaScript
  - Extraer los estilos a css/ (tokens, base, components, main) y la lógica a módulos ES en js/ (config, icons, state, features, ui, utils). Mantener el mismo comportamiento y los mismos datos en localStorage. Criterio de aceptación: la app se sirve con HTTP.serve, se ve y funciona igual que el monolito, sin errores en consola.
  - [x] Crear estructura de carpetas css/, js/, scripts/, data/
  - [x] Extraer variables de tema a css/tokens.css
  - [x] Extraer base y componentes a css/base.css y css/components.css
  - [x] Crear css/main.css con imports
  - [x] Extraer lógica a módulos js/ (config, icons, utils, state, features, ui)
  - [x] Reemplazar scripts inline por <script type="module">
  - [x] Delegación de eventos con data-action / data-edit
  - [ ] Probar la app con HTTP.serve y verificar paridad funcional

### Siguiente

- [ ] **v0.2.0** - Fase 2 - Migración de esquema y robustecer
  - Añadir versionado al state con migración desde el formato antiguo de rutina_builder_v2. Corregir el cálculo de fecha local, validar datos de entrada y limpiar timers al salir. Criterio de aceptación: los datos existentes se migran sin pérdida, las fechas son locales y no hay errores en consola.

- [ ] **v0.3.0** - Fase 3 - Optimizar y probar
  - Revisar rendimiento de render, evitar re-render innecesario, corregir casos borde (timer en 0, borrados pendientes, progreso fuera de rango). Criterio de aceptación: la app responde fluida, no pierde estado y los casos borde quedan cubiertos.

- [ ] **v0.4.0** - Fase 4 - Documentar y validar
  - Añadir README.md con estructura, uso con HTTP.serve, desarrollo y mantenimiento. Verificar coherencia con check.mjs. Criterio de aceptación: proyecto documentado, funcional completo, listo para añadir features.

### Terminado

_Nada terminado todavia._

### Descartado

_Nada descartado._

## Notas

- El monolito original queda versionado en el primer commit de Git; no hace falta copia `.bak`.
- El proyecto usa módulos ES nativos: requiere servirse por HTTP (no `file://`).

## Seguimiento

El progreso de este proyecto se registra en el historial de commits de Git, no en
este archivo. Cada commit lleva un prefijo de version `Vx.y.Z` y lista en el cuerpo
los archivos que modifica, de modo que `git log` funciona como bitacora del proyecto
y `git tag` marca el cierre de cada fase. La version vigente esta en el archivo
`VERSION` de la raiz del repositorio.
