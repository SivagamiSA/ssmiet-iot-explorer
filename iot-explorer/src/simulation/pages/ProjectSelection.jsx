import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Cpu } from 'lucide-react';
import { PROJECTS } from '../projects/index.js';
import ProjectCard from '../components/ProjectCard.jsx';
import { getAllProgress } from '../utils/progressStorage.js';
import { useSim } from '../utils/simContext.js';

const CATS = ['All', ...new Set(PROJECTS.map((p) => p.category))];
const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];

export default function ProjectSelection() {
  const nav = useNavigate();
  const { basePath, studentName } = useSim();
  const [q, setQ] = useState(''), [cat, setCat] = useState('All'), [lvl, setLvl] = useState('All');
  const prog = getAllProgress();
  const list = useMemo(() => PROJECTS.filter((p) =>
    (cat === 'All' || p.category === cat) && (lvl === 'All' || p.difficulty === lvl) &&
    (p.name + p.description + p.components.join(' ')).toLowerCase().includes(q.toLowerCase())), [q, cat, lvl]);
  const done = PROJECTS.filter((p) => prog[p.id]?.status === 'completed').length;
  return (
    <div className="sim-wrap">
      <header className="mb-5 rounded-lg border border-brand-100 bg-brand-50 p-5 sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl"><Cpu style={{ display: 'inline', marginRight: 8 }} color="#E8590C" />Arduino UNO Simulation Lab</h1>
        <p className="muted">Hi {studentName}. Pick a project. {done} of {PROJECTS.length} completed.</p>
        <div style={{ height: 8, borderRadius: 8, background: '#FFE5D1', overflow: 'hidden', maxWidth: 420 }}><div style={{ width: `${(done / PROJECTS.length) * 100}%`, height: '100%', background: '#E8590C' }} /></div>
      </header>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="flex items-center gap-2"><Search size={16} /><input type="search" placeholder="Search projects or parts" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search projects" /></label>
        {LEVELS.map((l) => <button key={l} className={`chip ${lvl === l ? 'on' : ''}`} onClick={() => setLvl(l)} aria-pressed={lvl === l}>{l}</button>)}
      </div>
      <div className="flex flex-wrap gap-2 mb-5">{CATS.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)} aria-pressed={cat === c}>{c}</button>)}</div>
      {list.length === 0 && <p className="muted">No projects match. Clear the search or filters.</p>}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))' }}>
        {list.map((p) => <ProjectCard key={p.id} project={p} record={prog[p.id]} onStart={() => nav(`${basePath}/guided/${p.id}`)} />)}
      </div>
    </div>
  );
}
