import { CheckCircle2, XCircle } from 'lucide-react';
export default function ResultPanel({ result }) {
  if (!result) return null;
  const { wiring, tests, passed } = result;
  return (
    <div className="panel" style={{ borderColor: passed ? '#86EFAC' : '#FCA5A5' }} role="status">
      <h3 style={{ color: passed ? '#166534' : '#991b1b' }}>{passed ? 'Validation passed' : 'Validation failed'}</h3>
      <p className="muted" style={{ marginTop: 0 }}>Wiring: {wiring.satisfied}/{wiring.total} connections correct · accuracy {wiring.accuracy}%</p>
      {wiring.errors.length > 0 && <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>{wiring.errors.map((e) => <li key={e} className="bad-t" style={{ fontSize: 13 }}>{e}</li>)}</ul>}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {tests.map((t) => (
          <li key={t.name} className="flex items-center gap-2" style={{ fontSize: 13 }}>
            {t.pass ? <CheckCircle2 size={14} color="#16a34a" /> : <XCircle size={14} color="#dc2626" />}{t.name}<span className="muted">— {t.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
