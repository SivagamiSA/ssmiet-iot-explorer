import { useEffect, useRef, useState } from 'react';
import { Download, Printer, Eye, FileText } from 'lucide-react';
import { dataUrlToPdfBlob } from './pdf.js';
import { drawCertificate } from './certificateDraw.js';

// The blue "Embedded IoT Experience Session" certificate (no certificate number). The template image has the blanks (name, school, date);
// they are drawn on top of it with canvas (certificateDraw.js) so the same picture can be shown, downloaded as PDF / PNG or printed.
const TEMPLATE = '/images/final-certificate.jpeg';

export default function FinalCertificate({ name, schoolName, standard, issuedAt, canDownload }) {
  const canvas = useRef(null);
  const [img, setImg] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const i = new Image();
    i.onload = () => setImg(i);
    i.onerror = () => setFailed(true);
    i.src = TEMPLATE;
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !img) return;
    drawCertificate(c, img, { name, schoolName, standard, issuedAt });
  }, [img, name, schoolName, standard, issuedAt]);

  const save = (blob, ext) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `IoT-Explorer-Certificate-${(name || 'student').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')}.${ext}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const downloadPng = () => canvas.current?.toBlob((blob) => blob && save(blob, 'png'), 'image/png');
  const downloadPdf = () => {
    const c = canvas.current; if (!c) return;
    save(dataUrlToPdfBlob(c.toDataURL('image/jpeg', 0.95), c.width, c.height), 'pdf');
  };
  // Opens the certificate full size in a new tab (written synchronously so pop-up blockers allow it).
  const viewFull = () => {
    const c = canvas.current; if (!c) return;
    const w = window.open('', '_blank');
    if (!w) { window.alert('Please allow pop-ups to view the certificate full size.'); return; }
    w.document.write(`<title>Certificate</title><body style="margin:0;background:#222;display:grid;place-items:center;min-height:100vh"><img src="${c.toDataURL('image/png')}" style="max-width:100%;height:auto" alt="Certificate"></body>`);
    w.document.close();
  };

  if (failed) return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">The certificate image could not be loaded.</p>;
  return (
    <div>
      <canvas ref={canvas} className="cert-print mx-auto block h-auto w-full max-w-3xl rounded-lg border border-line shadow-card" role="img" aria-label={`Certificate of Completion for ${name}`} />
      <div className="no-print mt-4 flex flex-wrap justify-center gap-3">
        <button type="button" className="btn-outline" onClick={viewFull} disabled={!canDownload}><Eye size={16} className="mr-2" />View full size</button>
        <button type="button" className="btn-primary" onClick={downloadPdf} disabled={!canDownload}><FileText size={16} className="mr-2" />Download PDF</button>
        <button type="button" className="btn-primary" onClick={downloadPng} disabled={!canDownload}><Download size={16} className="mr-2" />Download image (PNG)</button>
        <button type="button" className="btn-outline" onClick={() => window.print()} disabled={!canDownload}><Printer size={16} className="mr-2" />Print</button>
      </div>
      {!canDownload && <p className="no-print mt-2 text-center text-xs text-ink-faint">Click “Generate certificate” above to unlock view, download and print.</p>}
    </div>
  );
}
