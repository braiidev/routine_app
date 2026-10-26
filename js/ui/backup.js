import { buildExportPayload, parseImport, suggestExportFilename } from '../features/backup.js';
import { backupCurrentState, commit, getState, replaceState } from '../state/store.js';
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
    showToast('Rutina exportada');
  } catch(e){
    console.error(e);
    showToast('No se pudo exportar la rutina', { error: true });
  }
}

export async function importRoutineFile(file){
  if(!file) return;

  try {
    const text = await file.text();
    const { days, summary } = parseImport(text);
    const detail = `${summary.daysWithData} día(s) con datos, ${summary.groups} grupo(s) y ${summary.items} ejercicio(s).`;
    const confirmed = window.confirm(
      `Importar rutina\n\n${detail}\n\nSe reemplaza la rutina actual y antes se guarda una copia de seguridad en el navegador.\n\n¿Continuar?`
    );
    if(!confirmed) return;

    const backupKey = backupCurrentState('pre_import');
    replaceState(days);
    commit();

    if(backupKey){
      console.info(`[GymRutina] Copia previa a la importación guardada en localStorage: ${backupKey}`);
    }
    showToast(backupKey ? 'Rutina importada · copia previa guardada' : 'Rutina importada');
  } catch(e){
    showToast(e.message || 'No se pudo importar el archivo', { error: true, duration: 5000 });
  }
}
