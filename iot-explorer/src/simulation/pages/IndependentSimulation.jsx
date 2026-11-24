import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Lightbulb, Eraser, Lock, Circle } from 'lucide-react';
import { getProject } from '../projects/index.js';
import CircuitBoard from '../components/CircuitBoard.jsx';
import ComponentPanel from '../components/ComponentPanel.jsx';
import SimulationControls from '../components/SimulationControls.jsx';
import SimView from '../components/SimView.jsx';
import HintPanel from '../components/HintPanel.jsx';
import ResultPanel from '../components/ResultPanel.jsx';
import { useSimulation } from '../utils/useSimulation.js';
import { validateWiring } from '../utils/wiringValidator.js';
import { runTests } from '../utils/simulationEngine.js';
import { completeProject, getProgress, saveProgress } from '../utils/progressStorage.js';
import { useSim } from '../utils/simContext.js';

function Independent({ project, record }) {
  const nav = useNavigate();
  const { basePath } = useSim();
  const sim = useSimulation(project);
  const [wires, setWires] = useState([]);
  const [pending, setPending] = useState(null);
  const [attempts, setAttempts] = useState(record?.attempts || 0);
  const [hints, setHints] = useState(record?.hintsUsed || 0);
  const [result, setResult] = useState(null);
  const [muted, setMuted] = useState(false);
  // 'idle' -> 'started' (Start pressed with correct wiring) -> 'stopped' (Stop pressed afterwards)
  const [cycle, setCycle] = useState('idle');

  const wiring = useMemo(() => validateWiring(project, wires), [project, wires]);
  const { running, stop } = sim;

  useEffect(() => {
    if (!wiring.ok) {
      if (running) stop();
      setCycle('idle');
      return;
    }
    if (running) setCycle('started');
    else setCycle((c) => (c === 'started' ? 'stopped' : c));
  }, [wiring.ok, running, stop]);

  const onPin = (id) => {
    if (!pending) return setPending(id);
    if (pending === id) return setPending(null);
    setWires((w) => (w.some(([a, b]) => (a === pending && b === id) || (a === id && b === pending)) ? w : [...w, [pending, id]]));
    setPending(null);
    setResult(null);
    setCycle('idle');
  };

  const validate = () => {
    const w = validateWiring(project, wires);
    const att = attempts + 1;
    setAttempts(att);

    if (!w.ok) {
      setResult({ wiring: w, tests: [], passed: false });
      saveProgress(project, { attempts: att, hintsUsed: hints, connectionAccuracy: w.accuracy });
      return;
    }
    const ran = cycle === 'stopped';
    const runCheck = {
      name: 'Simulation started and stopped',
      pass: ran,
      detail: ran ? 'Passed' : cycle === 'started' ? 'Incorrect: the simulation is still running. Press Stop.' : 'Incorrect: press Start, then press Stop.',
    };
    if (!ran) {
      setResult({ wiring: w, tests: [runCheck], passed: false });
      saveProgress(project, { attempts: att, hintsUsed: hints, connectionAccuracy: w.accuracy });
      return;
    }
    const tests = [runCheck, ...runTests(project)];
    const passed = tests.every((t) => t.pass);
    setResult({ wiring: w, tests, passed });
    if (passed) {
      completeProject(project, { attempts: att, hintsUsed: hints, connectionAccuracy: w.accuracy, testResults: tests });
      nav(`${basePath}/complete/${project.id}`);
    } else {
      saveProgress(project, { attempts: att, hintsUsed: hints, connectionAccuracy: w.accuracy });
    }
  };

  const hint = () => {
    const n = Math.min(project.hints.length, hints + 1);
    if (n !== hints) { setHints(n); saveProgress(project, { hintsUsed: n }); }
  };

  const steps = [
    ['Wire the circuit correctly', wiring.ok],
    ['Press Start', cycle === 'started' || cycle === 'stopped'],
    ['Press Stop', cycle === 'stopped'],
  ];
  // LCD text, readings and buzzer only work once the circuit is wired correctly
  const live = wiring.ok ? project.live(sim.running ? sim.out : { ...sim.out, buzz: false }) : {};

  return (
    <div className="sim-wrap">
      <Link to={basePath} className="btn" style={{ marginBottom: 12 }}><ArrowLeft size={15} />Projects</Link>
      <h1 style={{ fontSize: 24, margin: '6px 0' }}>Independent practice: {project.name}</h1>
      <p className="muted" style={{ marginTop: 0 }}>{project.practice}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-4" style={{ alignContent: 'start' }}>
          <div className="panel">
            <CircuitBoard
              project={project} wires={wires} interactive pending={pending} onPinClick={onPin}
              onWireClick={(i) => { setWires((w) => w.filter((_, k) => k !== i)); setResult(null); setCycle('idle'); }}
              live={live}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              <button className="btn btn-ok" onClick={validate}><CheckCircle2 size={15} />Validate</button>
              <button className="btn btn-warn" onClick={hint} disabled={hints >= project.hints.length}><Lightbulb size={15} />Hint ({hints}/{project.hints.length})</button>
              <button className="btn" onClick={() => { setWires([]); setPending(null); setResult(null); setCycle('idle'); }}><Eraser size={15} />Clear wires</button>
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>Wires placed: {wires.length} · Attempts: {attempts} · Hints used: {hints}</p>
          </div>

          <div className="panel">
            <h3>To complete this project</h3>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {steps.map(([label, done]) => (
                <li key={label} className="flex items-center gap-2" style={{ fontSize: 14, color: done ? '#166534' : 'var(--mut)' }}>
                  {done ? <CheckCircle2 size={15} /> : <Circle size={15} />}{label}
                </li>
              ))}
            </ol>
            <p className="muted" style={{ marginBottom: 0 }}>Then press Validate. Without Start and Stop the result is incorrect.</p>
          </div>

          <ResultPanel result={result} />
          <HintPanel hints={project.hints} used={hints} />
          <ComponentPanel project={project} showPins={false} />
        </div>
        <div className="grid gap-4" style={{ alignContent: 'start' }}>
          <SimView project={project} sim={sim} muted={muted} powered={wiring.ok} />
          <SimulationControls project={project} sim={sim} canRun={wiring.ok} muted={muted} onMute={() => setMuted((m) => !m)} />
          {!wiring.ok && <p className="muted">Outputs stay off until the circuit is wired correctly. Use Validate to see what needs checking.</p>}
        </div>
      </div>
    </div>
  );
}

export default function IndependentSimulation() {
  const { id } = useParams();
  const { basePath } = useSim();
  const project = getProject(id);
  if (!project) return <div className="sim-wrap"><p>Project not found.</p><Link className="btn" to={basePath}>Back to projects</Link></div>;
  const record = getProgress(id);
  if (!record?.guidedCompleted) {
    return (
      <div className="sim-wrap"><div className="panel" style={{ maxWidth: 520 }}>
        <h3><Lock size={14} style={{ display: 'inline' }} /> Independent practice is locked</h3>
        <p className="muted">Complete the guided part of this project first.</p>
        <Link className="btn btn-primary" to={`${basePath}/guided/${id}`}>Go to guided simulation</Link>
      </div></div>
    );
  }
  return <Independent key={id} project={project} record={record} />;
}
