# TODO - GymRutina

## Descripcion

GymRutina es una app web móvil en HTML/JS/CSS para registrar y seguir rutinas de gimnasio con modos completo/mínimo, historial de finalizaciones y temporizador de descanso. Se construye sobre un único archivo index.html con localStorage. Consta de tabs por día, grupos de ejercicios, progreso por series, historial diario y cronómetro. Está terminado cuando la app funciona modularizada en archivos separados (html, css, js), mantiene compatibilidad con los datos existentes en localStorage, se puede servir con HTTP.serve y resulta más mantenible para añadir features y depurar errores.

## Estado

- Version actual: `v0.2.0`
- Fase en curso: Fase 3 - Optimizar y probar
- Siguiente version reservada: `v0.3.0`

## Tablero

### En curso

- [ ] **v0.3.0** - Fase 3 - Optimizar y probar
  - Mejorar el temporizador para que no derive en segundo plano, cachear las tabs para no reconstruirlas en cada click y corregir casos borde. Criterio de aceptación: el cronómetro mantiene la hora correcta al volver a la pestaña, cambiar de día no reconstruye el DOM innecesariamente y las pruebas siguen pasando.

### Siguiente

- [ ] **v0.4.0** - Fase 4 - Documentar y validar
  - Añadir README.md con estructura, uso con HTTP.serve, desarrollo y mantenimiento. Verificar coherencia con check.mjs. Criterio de aceptación: proyecto documentado, funcional completo, listo para añadir features.

### Terminado

- [x] **v0.1.0** - Fase 1 - Modularizar CSS y JavaScript
  - Extraer los estilos a css/ (tokens, base, components, main) y la lógica a módulos ES en js/ (config, icons, state, features, ui, utils). Mantener el mismo comportamiento y los mismos datos en localStorage. Criterio de aceptación: la app se sirve con HTTP.serve, se ve y funciona igual que el monolito, sin errores en consola.

- [x] **v0.2.0** - Fase 2 - Migración de esquema y robustecer
  - Añadir versionado al state con migración desde el formato antiguo de rutina_builder_v2, normalización de datos, fecha local, validación de campos y limpieza del temporizador al salir. Criterio de aceptación: los datos existentes se migran sin pérdida, las fechas son locales y las 18 pruebas de estado pasan.

### Descartado

_Nada descartado._

## Notas

- El monolito original queda versionado en el primer commit de Git; no hace falta copia `.bak`.
- El proyecto usa módulos ES nativos: requiere servirse por HTTP (no `file://`).
- Los datos se guardan en `gymrutina_state_v1` con `{ schemaVersion, days }`. El formato viejo (`rutina_builder_v2`) se migra al cargar y se conserva como respaldo.

## Seguimiento

El progreso de este proyecto se registra en el historial de commits de Git, no en
este archivo. Cada commit lleva un prefijo de version `Vx.y.Z` y lista en el cuerpo
los archivos que modifica, de modo que `git log` funciona como bitacora del proyecto
y `git tag` marca el cierre de cada fase. La version vigente esta en el archivo
`VERSION` de la raiz del repositorio.
