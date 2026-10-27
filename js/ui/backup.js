import { buildExportPayload, parseImport, suggestExportFilename } from '../features/backup.js';
import { backupCurrentState, commit, getState, replaceState } from '../state/store.js';
import { view } from '../state/view.js';
import { getLocalISODate } from '../utils/date.js';
import { showToast } from './toast.js';

export function exportRoutine(){
  try {
    const payload = buildExportPayload(getState());
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestExportFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Datos exportados');
  } catch(e){
    console.error(e);
    showToast('No se pudo exportar', { error: true });
  }
}

export async function importRoutineFile(file){
  if(!file) return;

  try {
    const text = await file.text();
    const { state, summary } = parseImport(text);
    const detail = `${summary.daysWithData} día(s) de plantilla con datos, ${summary.groups} grupo(s), ${summary.items} ejercicio(s) y ${summary.sessions} sesión(es) (${summary.completed} completas/mínimas, ${summary.partial} parciales).`;
    const confirmed = window.confirm(
      `Importar datos\n\n${detail}\n\nSe reemplaza la rutina y el historial actuales. Antes se guarda una copia de seguridad en el navegador.\n\n¿Continuar?`
    );
    if(!confirmed) return;

    const backupKey = backupCurrentState('pre_import');
    replaceState(state);
    view.todayDate = getLocalISODate();
    view.screen = 'today';
    view.selectedDate = view.todayDate;
    view.historySelectedDate = '';
    view.historyEditDate = '';
    view.historyVisibleWeeks = 8;
    view.draftModes = {};
    commit();

    if(backupKey){
      console.info(`[GymRutina] Copia previa a la importación guardada en localStorage: ${backupKey}`);
    }
    showToast(backupKey ? 'Datos importados · copia previa guardada' : 'Datos importados');
  } catch(e){
    showToast(e.message || 'No se pudo importar el archivo', { error: true, duration: 5000 });
  }
}
