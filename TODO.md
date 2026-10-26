# TODO - GymRutina

## Descripcion

GymRutina es una app web móvil para registrar y seguir rutinas de gimnasio con modos completo/mínimo, historial de finalizaciones y temporizador de descanso. Se construye sobre HTML, CSS y módulos ES nativos, sin build, con los datos en localStorage y respaldo JSON. Consta de tabs por día, grupos de ejercicios, progreso por series, historial diario, cronómetro y editor de rutina. Está terminada cuando se puede usar sin conexión, respaldar y restaurar la rutina, editar los ejercicios sin ambigüedad y consultar el historial completo desde el teléfono.

## Estado

- Version actual: `v0.7.1`
- Fase en curso: Fase 8 - Historial y reinicio diario
- Siguiente version reservada: `v0.8.0`

## Tablero

### En curso

- [ ] **v0.8.0** - Fase 8 - Historial y reinicio diario
  - Archivar el día anterior, registrar parciales y mostrar el historial completo por fecha y modo. El reinicio se detecta al abrir o volver a la app. Criterio de aceptación: al cambiar la fecha se archiva una sola vez el progreso anterior, los parciales no se duplican, los checks se limpian y el historial agrupa por mes con estados completo/mínimo/parcial.
  - [x] v0.7.1 - Reinicio diario, parciales e historial por mes
  - [ ] v0.7.2 - Documentación y checklist del reinicio

### Siguiente

- [ ] **v0.9.0** - Fase 9 - PWA/offline
  - Manifest, service worker e instalación en pantalla de inicio.

- [ ] **v0.10.0** - Fase 10 - Estadísticas
  - Racha, cumplimiento semanal y por grupo.

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

### Descartado

_Nada descartado._

## Notas

- El monolito original queda versionado en el primer commit de Git; no hace falta copia `.bak`.
- El proyecto usa módulos ES nativos: requiere servirse por HTTP (no `file://`).
- Los datos se guardan en `gymrutina_state_v1` con `{ schemaVersion, days }`. El formato viejo (`rutina_builder_v2`) se migra al cargar y se conserva como respaldo.
- La clave `gymrutina_last_active_date` guarda la última fecha local para detectar el cambio de día. Se mantiene fuera del esquema y del respaldo JSON.
- El reinicio diario se evalúa al abrir o recuperar foco; archiva el progreso anterior por día y modo, sin duplicar entradas, y limpia todos los checks una sola vez.
- Los parciales se archivan con el estado `partial`; un día completo sin entrada previa se archiva como `full` (completo) o `min` (mínimo).
- El esquema vigente es v2: `name` y `steps` compartidos, con `minName`/`minSteps` opcionales para el modo mínimo. El editor muestra solo ejercicio y series; el mínimo queda en una sección plegable.
- La mudanza está cerrada; las features nuevas se planifican desde `### Siguiente`.
- El respaldo JSON está cerrado; antes de importar se guarda `gymrutina_state_v1_backup_pre_import_<timestamp>`.
- El borrado de grupos y ejercicios es inmediato y se deshace desde el toast; ya no hay confirmación en dos pasos. Reordenar y duplicar usan `commit()` para repintar.
- El reinicio del día abre una hoja con dos opciones: modo actual o ambos. Solo limpia checks; el historial no se borra.
- La fase v0.7.0 se cerró con 43 pruebas y recursos HTTP 200; la pasada visual del checklist queda pendiente en el teléfono.
- Decidido para v0.8.0: el reinicio diario ocurre al abrir la app o volver a ella, no a medianoche.
- La fase v0.8.0 suma rollover con reloj inyectable, historial agrupado por mes y 49 pruebas; el reinicio manual no archiva.
- Candidatas para próximas fases: estadísticas semanales y PWA/offline.

## Seguimiento

El progreso de este proyecto se registra en el historial de commits de Git, no en
este archivo. Cada commit lleva un prefijo de version `Vx.y.Z` y lista en el cuerpo
los archivos que modifica, de modo que `git log` funciona como bitacora del proyecto
y `git tag` marca el cierre de cada fase. La version vigente esta en el archivo
`VERSION` de la raiz del repositorio.
