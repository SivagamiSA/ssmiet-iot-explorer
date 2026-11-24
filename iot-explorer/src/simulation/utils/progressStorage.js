// Persistence is isolated here. The browser copy is kept for speed; the student page also syncs each result to the server.
const KEY = 'iotsim.progress.v1';
let cfg = { studentId: null, onProjectComplete: null, onProgress: null };

export function configure(o) { cfg = { ...cfg, ...o }; }
export function getStudentId() {
  return cfg.studentId || localStorage.getItem('iotsim.studentId') || 'demo-student';
}
const readAll = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const writeAll = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* storage full or blocked */ } };

export function getProgress(projectId, sid = getStudentId()) { return readAll()[sid]?.[projectId] || null; }
export function getAllProgress(sid = getStudentId()) { return readAll()[sid] || {}; }

export function saveProgress(project, patch) {
  const sid = getStudentId();
  const all = readAll();
  const old = all[sid]?.[project.id] || {
    studentId: sid, projectId: project.id, projectName: project.name,
    guidedCompleted: false, independentCompleted: false, attempts: 0, hintsUsed: 0,
    connectionAccuracy: 0, validationPassed: false, testResults: [], status: 'in-progress', completedAt: null,
  };
  const rec = { ...old, ...patch, studentId: sid, projectId: project.id, projectName: project.name };
  rec.status = rec.validationPassed && rec.independentCompleted ? 'completed' : 'in-progress';
  all[sid] = { ...(all[sid] || {}), [project.id]: rec };
  writeAll(all);
  // A failed validation attempt is reported too (completion is reported by completeProject instead).
  if (patch.attempts !== undefined && !patch.validationPassed) { try { cfg.onProgress?.(rec); } catch (e) { console.error(e); } }
  return rec;
}

export function completeProject(project, data) {
  const rec = saveProgress(project, {
    ...data, guidedCompleted: true, independentCompleted: true, validationPassed: true,
    completedAt: new Date().toISOString(),
  });
  try { cfg.onProjectComplete?.(rec); } catch (e) { console.error(e); }
  window.dispatchEvent(new CustomEvent('iot-project-complete', { detail: rec }));
  return rec;
}
export function clearProgress() { localStorage.removeItem(KEY); }
