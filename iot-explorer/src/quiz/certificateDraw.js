// Draws the blanks (name, school + standard, date) on top of the blue "Embedded IoT Experience Session" template.
// There is no certificate number. The college name is already printed on the template itself.
export const NAVY = '#0a1c64';
export const SERIF = '"Times New Roman", "Liberation Serif", Georgia, serif';

// Where each blank sits on the 1280 x 858 template.
export const SPOTS = {
  name: { x: 640, y: 430, max: 560, size: 46 },    // above the first line
  school: { x: 665, y: 493, max: 500, size: 30 },  // after "of"
  date: { x: 640, y: 724, max: 340, size: 28 },    // on the line under "Date of Completion"
};

function put(ctx, text, { x, y, max, size }) {
  let s = size;
  ctx.font = `bold ${s}px ${SERIF}`;
  while (ctx.measureText(text).width > max && s > 12) { s -= 1; ctx.font = `bold ${s}px ${SERIF}`; } // long text shrinks to fit
  ctx.fillText(text, x, y);
}

export const fmtDate = (d) => new Date(d || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export function drawCertificate(canvas, img, { name, schoolName, standard, issuedAt }) {
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  ctx.fillStyle = NAVY; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  if (name) put(ctx, name, SPOTS.name);
  if (schoolName) put(ctx, `${schoolName}${standard ? ` | Standard ${standard}` : ''}`, SPOTS.school);
  put(ctx, fmtDate(issuedAt), SPOTS.date);
}
