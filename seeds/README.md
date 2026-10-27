# Datos de ejemplo

## Semilla v3

`gymrutina-demo.json` es una exportación válida del esquema v3 con:

- una rutina de 7 días, 16 grupos y 36 ejercicios;
- 37 sesiones entre agosto y octubre de 2026, sin fechas duplicadas ni el día
  actual;
- 20 sesiones completas, 7 mínimas y 10 parciales.

Las sesiones son fotos independientes: no hay progreso guardado dentro de la
plantilla. Cada fecha tiene un solo modo y un solo registro.

## Semilla v2 de compatibilidad

`gymrutina-demo-v2.json` conserva la semilla anterior, con `days`, `log` y
progreso por modo. Se mantiene como fixture de las pruebas de migración, pero
también se puede importar desde la app: sus logs se convierten en sesiones y su
progreso vigente se interpreta como una sesión de la fecha de importación.

## Importarlas

1. Abrí la app servida por HTTP.
2. Menú FAB → **Importar datos**.
3. Elegí `seeds/gymrutina-demo.json` o `seeds/gymrutina-demo-v2.json`.
4. Revisá el resumen y confirmá.

La importación reemplaza la rutina y el historial actuales y guarda una copia
previa en `localStorage` con el prefijo
`gymrutina_state_v1_backup_pre_import_`.

Si la app corre en el teléfono con Termux, el archivo ya está dentro del
proyecto. Para elegirlo desde el selector de archivos, copialo a una carpeta
visible (por ejemplo, Descargas) o descargalo desde
`http://localhost:8000/seeds/gymrutina-demo.json`.

## Regenerar la semilla v3

```bash
npm run seed
```

El generador es `scripts/build-demo-seed.mjs`. Las fechas se calculan para que
cada registro caiga en el mismo día de la semana que su día de plantilla y no
incluye el día de hoy, así el historial se puede ampliar al usar la app.
