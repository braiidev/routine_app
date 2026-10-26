# Datos de ejemplo

`gymrutina-demo.json` es una exportación válida de GymRutina (esquema v2) con:

- una rutina de 7 días, 16 grupos y 36 ejercicios;
- progreso actual parcial en algunos días;
- 37 registros de historial entre agosto y octubre de 2026, con los estados
  `full`, `min` y `partial` repartidos en los tres meses.

## Importarlo

1. Abrí la app servida por HTTP.
2. Menú FAB → **Importar rutina**.
3. Elegí `seeds/gymrutina-demo.json`.
4. Revisá el resumen y confirmá.

La importación reemplaza la rutina actual y guarda una copia previa en
`localStorage` con el prefijo `gymrutina_state_v1_backup_pre_import_`.

Si la app corre en el teléfono con Termux, el archivo ya está dentro del proyecto.
Para elegirlo desde el selector de archivos, copialo a una carpeta visible
(por ejemplo, Descargas) o descargalo desde
`http://localhost:8000/seeds/gymrutina-demo.json`.

## Regenerarlo

```bash
npm run seed
```

El generador es `scripts/build-demo-seed.mjs`. Las fechas se calculan para que
cada registro caiga en el mismo día de la semana que su tab y no incluye el día
de hoy, así el historial se puede ampliar al usar la app.
