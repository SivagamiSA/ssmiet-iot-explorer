import { useCallback, useEffect, useState } from 'react';
import StudentNav from '../components/student/StudentNav';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { showNotice } from '../lib/notice';
import SimulationModule from './SimulationModule.jsx';

const KEY = 'iotsim.progress.v1'; // the simulation module's own browser storage: { [studentId]: { [projectId]: record } }
const toBody = (rec) => ({ attempts: rec.attempts, connectionAccuracy: rec.connectionAccuracy, completed: !!(rec.validationPassed && rec.independentCompleted) });

/** Student portal > Projects & Simulation. Mounts the simulation lab inside the normal student page layout,
 *  loads the student's saved rows from the server before it opens, and saves results back to the server. */
export default function StudentSimulationPage() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    api('/student/simulations').then(({ items }) => {
      try {
        const all = JSON.parse(localStorage.getItem(KEY)) || {};
        const mine = { ...(all[user.id] || {}) };
        for (const s of items) {
          const old = mine[s.projectSlug];
          if (old?.status === 'completed') continue; // the browser already has the full record
          const done = !!s.completed;
          mine[s.projectSlug] = {
            ...(old || { hintsUsed: 0, testResults: [] }),
            studentId: user.id, projectId: s.projectSlug, projectName: old?.projectName || s.projectSlug,
            attempts: Math.max(old?.attempts || 0, s.attempts || 0), connectionAccuracy: Math.max(old?.connectionAccuracy || 0, s.bestScore || 0),
            guidedCompleted: done || !!old?.guidedCompleted, independentCompleted: done, validationPassed: done,
            status: done ? 'completed' : 'in-progress', completedAt: done ? (s.lastAttemptAt || new Date().toISOString()) : null,
          };
        }
        all[user.id] = mine;
        localStorage.setItem(KEY, JSON.stringify(all));
      } catch { /* browser storage blocked: the lab still works for this visit */ }
    }).catch(() => {}).finally(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, [user.id]);

  const onProjectComplete = useCallback(async (rec) => {
    try {
      const r = await api(`/student/simulations/${rec.projectId}`, { method: 'PUT', body: toBody(rec) });
      if (r.pointsAwarded) showNotice(`+${r.pointsAwarded} points for finishing this project`);
    } catch (e) { console.warn(e.message); }
  }, []);
  const onProgress = useCallback((rec) => { api(`/student/simulations/${rec.projectId}`, { method: 'PUT', body: toBody(rec) }).catch(() => {}); }, []);

  return (
    <>
      <StudentNav />
      <div className="bg-surface px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          {!ready
            ? <p role="status" className="py-10 text-center text-ink-soft">Loading your simulation progress…</p>
            : <SimulationModule studentId={user.id} studentName={user.name} basePath="/student/projects" quizRoute="/student/quizzes/:projectId" onProjectComplete={onProjectComplete} onProgress={onProgress} />}
        </div>
      </div>
    </>
  );
}
