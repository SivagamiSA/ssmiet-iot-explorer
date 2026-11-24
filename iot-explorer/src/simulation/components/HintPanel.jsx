import { Lightbulb } from 'lucide-react';
export default function HintPanel({ hints, used }) {
  if (!used) return null;
  return (
    <div className="panel" style={{ borderColor: '#F5B38A' }} role="status">
      <h3 style={{ color: '#A63B04' }}><Lightbulb size={14} style={{ display: 'inline' }} /> Hints</h3>
      <ol style={{ margin: 0, paddingLeft: 18 }}>{hints.slice(0, used).map((h) => <li key={h} className="muted">{h}</li>)}</ol>
    </div>
  );
}
