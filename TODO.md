# TODO - GymRutina

## Descripcion

GymRutina es una app web móvil en HTML/JS/CSS para registrar y seguir rutinas de gimnasio con modos completo/mínimo, historial de finalizaciones y temporizador de descanso. Se construye sobre un único archivo index.html con localStorage. Consta de tabs por día, grupos de ejercicios, progreso por series, historial diario y cronómetro. Está terminado cuando la app funciona modularizada en archivos separados (html, css, js), mantiene compatibilidad con los datos existentes en localStorage, se puede servir con HTTP.serve y resulta más mantenible para añadir features y depurar errores.

## Estado

- Version actual: `v0.4.1`
- Fase en curso: Fase 5 - Respaldo de datos
- Siguiente version reservada: `v0.5.0`

## Tablero

### En curso

- [ ] **v0.5.0** - Fase 5 - Respaldo de datos
  - Exportar e importar la rutina en JSON para sobrevivir a un borrado del navegador o a un cambio de teléfono. Criterio de aceptación: exportar descarga un archivo válido, importar valida y pide confirmación, guarda una copia previa y las pruebas cubren los casos rotos.
  - [x] v0.4.1 - Exportar e importar JSON con validación y copia previa
  - [ ] v0.4.2 - Documentación del respaldo

### Siguiente

- [ ] **v0.6.0** - Fase 6 - Schema v2 y editor simple
  - Un solo nombre y una sola cantidad de series por ejercicio, con override opcional para modo mínimo; editor de dos campos visibles, alta rápida, "Opcional" con texto y controles táctiles de 44 px.

- [ ] **v0.7.0** - Fase 7 - Interacción y pulido
  - Reordenar con flechas, duplicar, deshacer borrados con toast, reset del día con opciones, labels del timer y accesibilidad.

- [ ] **v0.8.0** - Fase 8 - Historial y reinicio diario
  - Archivar el día anterior, registrar parciales y mostrar el historial completo por fecha y modo.

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

### Descartado

_Nada descartado._

## Notas

- El monolito original queda versionado en el primer commit de Git; no hace falta copia `.bak`.
- El proyecto usa módulos ES nativos: requiere servirse por HTTP (no `file://`).
- Los datos se guardan en `gymrutina_state_v1` con `{ schemaVersion, days }`. El formato viejo (`rutina_builder_v2`) se migra al cargar y se conserva como respaldo.
- La mudanza está cerrada; las features nuevas se planifican desde `### Siguiente`.
- Candidatas para próximas fases: export/import JSON, estadísticas semanales, reinicio automático por fecha y PWA/offline.

## Seguimiento

El progreso de este proyecto se registra en el historial de commits de Git, no en
este archivo. Cada commit lleva un prefijo de version `Vx.y.Z` y lista en el cuerpo
los archivos que modifica, de modo que `git log` funciona como bitacora del proyecto
y `git tag` marca el cierre de cada fase. La version vigente esta en el archivo
`VERSION` de la raiz del repositorio.
