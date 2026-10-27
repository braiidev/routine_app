#!/usr/bin/env node
/**
 * build-demo-seed.mjs
 *
 * Genera seeds/gymrutina-demo.json con una rutina realista y ~3 meses de
 * historial. Las fechas se eligen para que coincidan con el día de la semana
 * de cada tab (Lun..Dom), aunque la app no lo exige.
 *
 * Uso: npm run seed
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'seeds');
const OUT_FILE = resolve(OUT_DIR, 'gymrutina-demo.json');
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const WEEKDAY = { Lun: 1, Mar: 2, Mié: 3, Jue: 4, Vie: 5, Sáb: 6, Dom: 0 };
const EXPORTED_AT = '2026-10-26T09:00:00.000Z';

const ROUTINE = {
  Lun: {
    mode: 'completo',
    notes: 'Pecho y tríceps. Calentar 10 minutos.',
    groups: [
      {
        name: 'Pecho',
        items: [
          { name: 'Press banca', steps: 4, minName: 'Press banca (ligero)', minSteps: 2, current: { completo: 2 } },
          { name: 'Press inclinado', steps: 3, current: { completo: 1 } },
          { name: 'Aperturas en polea', steps: 3 }
        ]
      },
      {
        name: 'Tríceps',
        items: [
          { name: 'Fondos en paralelas', steps: 3, minSteps: 2 },
          { name: 'Extensión de tríceps', steps: 3 }
        ]
      },
      {
        name: 'Cardio',
        optional: true,
        items: [{ name: 'Cinta suave', steps: 1 }]
      }
    ]
  },
  Mar: {
    mode: 'completo',
    notes: 'Espalda y bíceps. Cuidar la técnica en dominadas.',
    groups: [
      {
        name: 'Espalda',
        items: [
          { name: 'Dominadas', steps: 4, minName: 'Dominadas asistidas', minSteps: 2, current: { completo: 1 } },
          { name: 'Remo con barra', steps: 4, minSteps: 3, current: { completo: 2 } },
          { name: 'Jalón al pecho', steps: 3 }
        ]
      },
      {
        name: 'Bíceps',
        items: [
          { name: 'Curl con barra', steps: 3, current: { completo: 1 } },
          { name: 'Curl martillo', steps: 3 }
        ]
      },
      {
        name: 'Core',
        optional: true,
        items: [{ name: 'Plancha', steps: 3 }]
      }
    ]
  },
  Mié: {
    mode: 'minimo',
    notes: 'Piernas. En modo mínimo, bajar volumen pero mantener sentadilla.',
    groups: [
      {
        name: 'Piernas',
        items: [
          { name: 'Sentadilla', steps: 5, minName: 'Sentadilla (series cómodas)', minSteps: 3, current: { minimo: 2 } },
          { name: 'Prensa', steps: 4, minSteps: 3, current: { minimo: 1 } },
          { name: 'Peso muerto rumano', steps: 4, minSteps: 2 },
          { name: 'Extensiones', steps: 3, minSteps: 2 }
        ]
      },
      {
        name: 'Gemelos',
        items: [
          { name: 'Elevación de gemelos', steps: 3, minSteps: 2, current: { minimo: 1 } }
        ]
      },
      {
        name: 'Movilidad',
        optional: true,
        items: [{ name: 'Movilidad de cadera', steps: 2 }]
      }
    ]
  },
  Jue: {
    mode: 'completo',
    notes: 'Hombro y core. No llegar al fallo en press militar.',
    groups: [
      {
        name: 'Hombro',
        items: [
          { name: 'Press militar', steps: 4, minSteps: 2, current: { completo: 1 } },
          { name: 'Elevaciones laterales', steps: 3 },
          { name: 'Pájaros', steps: 3 }
        ]
      },
      {
        name: 'Core',
        items: [
          { name: 'Plancha', steps: 3, current: { completo: 1 } },
          { name: 'Abdominales en polea', steps: 3 }
        ]
      }
    ]
  },
  Vie: {
    mode: 'completo',
    notes: 'Full body. Priorizar técnica sobre peso.',
    groups: [
      {
        name: 'Full body',
        items: [
          { name: 'Peso muerto', steps: 4, minSteps: 2 },
          { name: 'Remo con barra', steps: 4 },
          { name: 'Press banca', steps: 4 },
          { name: 'Sentadilla', steps: 4, minSteps: 3 }
        ]
      },
      {
        name: 'Brazos',
        items: [
          { name: 'Curl alterno', steps: 3 },
          { name: 'Extensión de tríceps', steps: 3 }
        ]
      }
    ]
  },
  Sáb: {
    mode: 'completo',
    notes: 'Cardio y movilidad. Si venís cansado, hacé solo movilidad.',
    groups: [
      {
        name: 'Cardio',
        items: [
          { name: 'Cinta', steps: 1 },
          { name: 'Bicicleta', steps: 1 }
        ]
      },
      {
        name: 'Movilidad',
        optional: true,
        items: [
          { name: 'Movilidad general', steps: 2 },
          { name: 'Estiramientos', steps: 2 }
        ]
      }
    ]
  },
  Dom: {
    mode: 'completo',
    notes: 'Descanso activo: caminata suave y estiramientos.',
    groups: [
      {
        name: 'Descanso activo',
        items: [
          { name: 'Caminata', steps: 1 },
          { name: 'Movilidad general', steps: 3 },
          { name: 'Estiramientos', steps: 3 }
        ]
      }
    ]
  }
};

const LOG_PLAN = {
  Lun: [
    { date: '2026-08-03', mode: 'completo', status: 'full' },
    { date: '2026-08-31', mode: 'completo', status: 'partial' },
    { date: '2026-09-14', mode: 'completo', status: 'full' },
    { date: '2026-09-28', mode: 'minimo', status: 'min' },
    { date: '2026-10-12', mode: 'completo', status: 'full' },
    { date: '2026-10-19', mode: 'minimo', status: 'partial' }
  ],
  Mar: [
    { date: '2026-08-04', mode: 'completo', status: 'full' },
    { date: '2026-09-01', mode: 'completo', status: 'partial' },
    { date: '2026-09-15', mode: 'completo', status: 'full' },
    { date: '2026-10-06', mode: 'minimo', status: 'min' },
    { date: '2026-10-20', mode: 'completo', status: 'full' }
  ],
  Mié: [
    { date: '2026-08-05', mode: 'completo', status: 'partial' },
    { date: '2026-09-02', mode: 'completo', status: 'full' },
    { date: '2026-09-16', mode: 'minimo', status: 'min' },
    { date: '2026-10-07', mode: 'completo', status: 'full' },
    { date: '2026-10-21', mode: 'minimo', status: 'partial' }
  ],
  Jue: [
    { date: '2026-08-06', mode: 'completo', status: 'full' },
    { date: '2026-09-03', mode: 'minimo', status: 'min' },
    { date: '2026-09-17', mode: 'completo', status: 'full' },
    { date: '2026-10-08', mode: 'minimo', status: 'partial' },
    { date: '2026-10-22', mode: 'completo', status: 'full' }
  ],
  Vie: [
    { date: '2026-08-07', mode: 'completo', status: 'partial' },
    { date: '2026-08-21', mode: 'completo', status: 'full' },
    { date: '2026-09-04', mode: 'completo', status: 'full' },
    { date: '2026-09-18', mode: 'minimo', status: 'partial' },
    { date: '2026-10-09', mode: 'completo', status: 'full' },
    { date: '2026-10-23', mode: 'minimo', status: 'min' }
  ],
  Sáb: [
    { date: '2026-08-08', mode: 'completo', status: 'full' },
    { date: '2026-09-05', mode: 'minimo', status: 'min' },
    { date: '2026-09-19', mode: 'completo', status: 'full' },
    { date: '2026-10-10', mode: 'completo', status: 'partial' },
    { date: '2026-10-24', mode: 'completo', status: 'full' }
  ],
  Dom: [
    { date: '2026-08-09', mode: 'completo', status: 'full' },
    { date: '2026-09-06', mode: 'minimo', status: 'partial' },
    { date: '2026-09-20', mode: 'minimo', status: 'min' },
    { date: '2026-10-11', mode: 'completo', status: 'full' },
    { date: '2026-10-25', mode: 'completo', status: 'full' }
  ]
};

function effectiveName(item, mode){
  return mode === 'minimo' && item.minName ? item.minName : item.name;
}

function effectiveSteps(item, mode){
  return mode === 'minimo' && item.minSteps != null ? item.minSteps : item.steps;
}

function buildTemplate(){
  const template = {};

  DAYS.forEach((dayName, dayIdx) => {
    const spec = ROUTINE[dayName];
    let itemNumber = 0;

    template[dayName] = {
      title: dayName,
      defaultMode: spec.mode,
      notes: spec.notes,
      groups: spec.groups.map((group, groupIdx) => ({
        id: `d${dayIdx + 1}-g${groupIdx + 1}`,
        name: group.name,
        optional: Boolean(group.optional),
        items: group.items.map(item => ({
          id: `d${dayIdx + 1}-i${++itemNumber}`,
          name: item.name,
          steps: item.steps,
          minName: item.minName ?? null,
          minSteps: item.minSteps ?? null
        }))
      }))
    };
  });

  return template;
}

function buildSession(templateDay, dayName, row, variant){
  const groups = templateDay.groups.filter(g => row.mode === 'completo' || !g.optional);
  const flatItems = groups.flatMap(g => g.items.map(item => ({ group: g, item })));
  if(flatItems.length < 2) throw new Error('Una sesión necesita al menos dos ejercicios.');

  let doneCount = flatItems.length;
  if(row.status === 'partial'){
    const ratio = 0.45 + (variant % 3) * 0.15;
    doneCount = Math.max(1, Math.min(flatItems.length - 1, Math.floor(flatItems.length * ratio)));
  }

  let flatIndex = 0;
  const sessionGroups = groups.map(group => ({
    id: group.id,
    name: group.name,
    optional: group.optional,
    items: group.items.map(item => {
      const steps = effectiveSteps(item, row.mode);
      const done = flatIndex < doneCount ? steps : 0;
      flatIndex++;
      return {
        id: item.id,
        text: effectiveName(item, row.mode),
        steps,
        done
      };
    })
  }));

  const items = sessionGroups.flatMap(g => g.items);
  const allDone = items.every(item => item.done >= item.steps);
  const anyDone = items.some(item => item.done > 0);

  if(row.status === 'partial' && (allDone || !anyDone)) throw new Error('El parcial quedó completo o vacío.');
  if(row.status !== 'partial' && !allDone) throw new Error(`El estado ${row.status} quedó incompleto.`);
  if(row.status === 'full' && row.mode !== 'completo') throw new Error('full debe usar modo completo.');
  if(row.status === 'min' && row.mode !== 'minimo') throw new Error('min debe usar modo mínimo.');

  return {
    date: row.date,
    day: dayName,
    mode: row.mode,
    groups: sessionGroups
  };
}

function buildSessions(template){
  const sessions = {};

  DAYS.forEach(dayName => {
    const plan = LOG_PLAN[dayName];
    plan.forEach((row, logIdx) => {
      const dt = new Date(`${row.date}T12:00:00`);
      if(Number.isNaN(dt.getTime()) || dt.getDay() !== WEEKDAY[dayName]){
        throw new Error(`${row.date} no cae en ${dayName}.`);
      }
      if(row.date >= '2026-10-26') throw new Error(`${row.date} no es una fecha histórica.`);
      if(sessions[row.date]) throw new Error(`Hay más de una sesión para ${row.date}.`);

      sessions[row.date] = buildSession(template[dayName], dayName, row, logIdx);
    });
  });

  const ordered = {};
  Object.keys(sessions).sort().forEach(date => { ordered[date] = sessions[date]; });
  return ordered;
}

function main(){
  const template = buildTemplate();
  const sessions = buildSessions(template);
  const payload = {
    app: 'gymrutina',
    schemaVersion: 3,
    exportedAt: EXPORTED_AT,
    template,
    sessions
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);

  const summary = DAYS.reduce((acc, dayName) => {
    const day = template[dayName];
    acc.groups += day.groups.length;
    acc.items += day.groups.reduce((n, g) => n + g.items.length, 0);
    return acc;
  }, { groups: 0, items: 0, sessions: 0, full: 0, min: 0, partial: 0 });

  Object.values(sessions).forEach(session => {
    summary.sessions++;
    const items = session.groups.flatMap(g => g.items);
    const allDone = items.every(item => item.done >= item.steps);
    if(!allDone) summary.partial++;
    else summary[session.mode === 'minimo' ? 'min' : 'full']++;
  });

  console.log(`Seed escrito en ${OUT_FILE}`);
  console.log(`${DAYS.length} días · ${summary.groups} grupos · ${summary.items} ejercicios · ${summary.sessions} sesiones`);
  console.log(`Estados: ${summary.full} full · ${summary.min} min · ${summary.partial} partial`);
}

main();
