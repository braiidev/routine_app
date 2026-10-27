# TODO - GymRutina

## Descripcion

GymRutina es una app web móvil para registrar entrenamientos por fecha a partir de una plantilla semanal con modos completo/mínimo, consultar un historial semanal de siete días, corregir días pasados, seguir la racha y usar un temporizador de descanso. Se construye sobre HTML, CSS y módulos ES nativos, sin build, con los datos en localStorage y respaldo JSON. Está terminada cuando se puede registrar el día actual, consultar y corregir cualquier fecha, ver rachas y estadísticas, respaldar y restaurar la rutina y usar la app sin conexión desde el teléfono.

## Estado

- Version actual: `v0.9.3`
- Fase en curso: -
- Siguiente version reservada: `v0.10.0`

## Tablero

### En curso

_Nada en curso: la fase de sesiones por fecha, historial semanal y racha quedó cerrada._

### Siguiente

- [ ] **v0.10.0** - Fase 10 - PWA/offline
  - Manifest, service worker, instalación en pantalla de inicio y caché de la app.

- [ ] **v0.11.0** - Fase 11 - Estadísticas
  - Cumplimiento semanal y por grupo, además de la racha ya existente.

### Terminado

- [x] **v0.1.0** - Fase 1 - Modularizar CSS y JavaScript
  - Extraer los estilos a css/ (tokens, base, components, main) y la lógica a módulos ES en js/ (config, icons, state, features, ui, utils). Mantener el mismo comportamiento y los mismos datos en localStorage. Criterio de aceptación: la app se sirve con HTTP.serve, se ve y funciona igual que el monolito, sin errores en consola.

- [x] **v0.2.0** - Fase 2 - Migración de esquema y robustecer
  - Añadir versionado al state con migración desde el formato antiguo de rutina_builder_v2, normalización de datos, fecha local, validación de campos y limpieza del temporizador al salir. Criterio de aceptación: los datos existentes se migran sin pérdida, las fechas son locales y las pruebas de estado pasan.

- [x] **v0.3.0** - Fase 3 - Optimizar y probar
  - Cronómetro basado en hora de fin para no derivar en segundo plano, tabs cacheadas para no reconstruir el DOM, límite de tiempo personalizado, borrados pendientes limpios al cambiar de vista y utilidades de tiempo con pruebas. Criterio de aceptación: el temporizador mantiene la hora correcta al volver a la pestaña, cambiar de día no reconstruye las tabs y las pruebas pasan.

- [x] **v0.3.1** - Parche - Acotar series y avisar del fallo de guardado
  - Limitar las series a 100 en migración, edición e input; avisar por consola si localStorage rechaza el guardado. Criterio de aceptación: no se generan miles de puntos y el fallo de persistencia deja de ser silencioso.

- [x] **v0.4.0** - Fase 4 - Documentar y validar
  - README.md con estructura, uso con HTTP.serve, datos, convenciones y cómo agregar features; favicon y metadatos para evitar ruido en consola. Criterio de aceptación: proyecto documentado, 21 pruebas pasan, check.mjs limpio y todos los recursos responden 200 por HTTP.

- [x] **v0.5.0** - Fase 5 - Respaldo de datos
  - Exportar e importar la rutina en JSON para sobrevivir a un borrado del navegador o a un cambio de teléfono. Criterio de aceptación: exportar descarga un archivo válido, importar valida y pide confirmación, guarda una copia previa y las pruebas cubren los casos rotos.

- [x] **v0.6.0** - Fase 6 - Schema v2 y editor simple
  - Un solo nombre y una sola cantidad de series por ejercicio, con override opcional para modo mínimo; editor de dos campos visibles, alta rápida, "Opcional" con texto y controles táctiles de 44 px. Criterio de aceptación: editar un ejercicio deja de pedir dos nombres y dos series, la migración conserva los datos y el progreso, el alta se descubre sin instrucciones y las pruebas pasan.

- [x] **v0.7.0** - Fase 7 - Interacción y pulido
  - Reordenar con flechas, duplicar, deshacer borrados con toast, reset del día con opciones, labels del timer y accesibilidad. Criterio de aceptación: se puede ordenar y duplicar sin perder datos, un borrado se revierte desde el toast, el reinicio distingue modo actual de ambos, el timer se entiende y los controles esenciales tienen nombre accesible.
  - [x] v0.6.1 - Reordenar, duplicar, deshacer borrados y toasts
  - [x] v0.6.2 - Reinicio por modo, timer y accesibilidad
  - [x] v0.6.3 - Checklist manual y documentación

- [x] **v0.8.0** - Fase 8 - Historial y reinicio diario
  - Archivar el día anterior, registrar parciales y mostrar el historial completo por fecha y modo. El reinicio se detecta al abrir o volver a la app. Criterio de aceptación: al cambiar la fecha se archiva una sola vez el progreso anterior, los parciales no se duplican, los checks se limpian y el historial agrupa por mes con estados completo/mínimo/parcial.
  - [x] v0.7.1 - Reinicio diario, parciales e historial por mes
  - [x] v0.7.2 - Documentación y checklist del reinicio
  - [x] v0.8.1 - Exportación de ejemplo con tres meses de historial

- [x] **v0.9.0** - Fase 9 - Sesiones por fecha, historial semanal y racha
  - Reemplazar el progreso por día de semana por sesiones inmutables indexadas por fecha ISO local, con una sola sesión y un modo por fecha, checks bloqueados fuera de hoy, vista previa de días futuros, registro y corrección retroactiva, historial semanal de siete días con detalle, racha actual y mejor racha derivadas, migración v1/v2 con copia cruda, prioridad `full > min > partial` y exportación/importación v3. Criterio de aceptación: editar la plantilla no altera sesiones guardadas, el historial muestra días vacíos y agrupación mensual, la semilla v2 migra sin perder sus 37 registros, 40 pruebas pasan y el check queda limpio tras el commit.

### Descartado

_Nada descartado._

## Notas

- El monolito original queda versionado en el primer commit de Git; no hace falta copia `.bak`.
- El proyecto usa módulos ES nativos: requiere servirse por HTTP (no `file://`).
- El esquema vigente es v3: `{ schemaVersion: 3, template, sessions }`, guardado en la clave histórica `gymrutina_state_v1`.
- `template` no guarda progreso ni logs. `sessions` indexa una sesión por fecha ISO local con una foto de ejercicios, series y checks.
- El estado de una sesión se deriva de sus items: `empty`, `partial`, `full` o `min`; no se persiste un contador de estado ni de racha.
- La clave `gymrutina_last_active_date` queda solo para migrar el progreso v2 de la última fecha activa. Ya no hay rollover ni archivo `rollover.js`.
- Antes de migrar se guarda el JSON crudo en `gymrutina_state_v1_backup_pre_v3_<timestamp>` (o en la clave legada si vino de `rutina_builder_v2`); un JSON futuro se conserva en `<clave>_backup_future_vN_<timestamp>`.
- El respaldo JSON está cerrado; antes de importar se guarda `gymrutina_state_v1_backup_pre_import_<timestamp>`.
- El borrado de grupos y ejercicios es inmediato y se deshace desde el toast. Reordenar y duplicar usan `commit()` para repintar.
- El reinicio del día abre una hoja de confirmación. Borra solo la sesión de hoy; la plantilla no cambia y, si la sesión estaba completa, afecta historial y racha.
- Cambiar el modo de una fecha con checks pide confirmación y reinicia esa sesión, tanto en Hoy como al corregir un día pasado.
- Los días futuros se ven como plantilla sin checks y se editan desde el botón **Editar rutina**; los pasados se registran y corrigen desde Historial.
- La fase v0.7.0 se cerró con 43 pruebas y recursos HTTP 200; la pasada visual del checklist queda pendiente en el teléfono.
- La fase v0.8.0 se cerró con rollover de reloj inyectable, historial agrupado por mes, 49 pruebas, check limpio y recursos HTTP 200; la pasada visual del checklist queda pendiente en el teléfono.
- v0.8.1 agregó `seeds/gymrutina-demo.json`, una exportación con 7 días, 16 grupos, 36 ejercicios y 37 registros; se regenera con `npm run seed`.
- v0.9.0 regeneró la semilla en v3 (20 completas, 7 mínimas y 10 parciales), conservó la v2 como fixture de compatibilidad y dejó 40 pruebas. La validación visual en navegador/teléfono sigue pendiente.
- Candidatas para próximas fases: PWA/offline (v0.10.0) y estadísticas (v0.11.0).

## Seguimiento

El progreso de este proyecto se registra en el historial de commits de Git, no en
este archivo. Cada commit lleva un prefijo de version `Vx.y.Z` y lista en el cuerpo
los archivos que modifica, de modo que `git log` funciona como bitacora del proyecto
y `git tag` marca el cierre de cada fase. La version vigente esta en el archivo
`VERSION` de la raiz del repositorio.
