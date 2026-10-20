const pt = (r: number, degrees: number) => ({ x: 180 + r * Math.cos(degrees * Math.PI / 180), y: 245 + r * Math.sin(degrees * Math.PI / 180) });
const angle = (c: number) => 205 + (Math.max(-50, Math.min(50, c)) + 50) * 1.3;
const arc = (r: number, a: number, b: number) => {
  const s = pt(r, a), e = pt(r, b);
  return `M${s.x},${s.y} A${r},${r} 0 0,1 ${e.x},${e.y}`;
};
export function meterMarkup(label: string) {
  let ticks = '';
  for (let c = -50; c <= 50; c += 5) {
    const zero = c === 0, major = c % 10 === 0;
    const a = pt(130 + (zero ? 21 : major ? 17 : 11), angle(c)), b = pt(130 + (zero ? -5 : major ? 3 : 4), angle(c));
    ticks += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${zero ? '#d2d8df' : major ? '#788595' : '#3d495a'}" stroke-width="${zero ? 2.5 : major ? 1.5 : 1}" stroke-linecap="round"/>`;
  }
  const labels = [-50, -25, 0, 25, 50].map(c => { const p = pt(167, angle(c)); return `<text x="${p.x}" y="${p.y + 3.5}" text-anchor="middle">${c > 0 ? '+' : ''}${c}</text>`; }).join('');
  return `<svg viewBox="0 0 360 270" role="img" aria-label="${label}">
    <defs><filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/></filter></defs>
    <path d="${arc(130, 205, 260)}" class="ghost low"/><path d="${arc(130, 260, 280)}" class="ghost tuned"/><path d="${arc(130, 280, 335)}" class="ghost high"/>
    <path d="${arc(130, 205, 335)}" fill="none" stroke="#ffffff14" stroke-width="3"/>
    <path id="active-arc" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>
    ${ticks}${labels}<circle class="zero-glow" cx="180" cy="93" r="10" fill="currentColor" filter="url(#glow)"/>
    <circle id="zero" cx="180" cy="93" r="3.5"/>
    <g id="needle"><line x1="180" y1="245" x2="180" y2="124" stroke="currentColor" stroke-width="10" opacity="0.2" filter="url(#glow)"/>
    <line x1="180" y1="245" x2="180" y2="124" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><circle cx="180" cy="124" r="4" fill="currentColor"/></g>
    <circle cx="180" cy="245" r="14" fill="#060f1d" stroke="#ffffff10" stroke-width="1.5"/><circle cx="180" cy="245" r="9" fill="#0c1a2d" stroke="#ffffff0a"/><circle cx="180" cy="245" r="5" fill="currentColor"/>
  </svg>`;
}
export function moveNeedle(cents: number, visible: boolean) {
  document.querySelector('#needle')!.setAttribute('transform', `rotate(${angle(cents) - 270} 180 245)`);
  document.querySelector('#needle')!.setAttribute('opacity', visible ? '1' : '0');
  const path = document.querySelector('#active-arc')!;
  path.setAttribute('d', arc(130, Math.min(270, angle(cents)), Math.max(270.001, angle(cents))));
  path.setAttribute('opacity', visible && Math.abs(cents) > 0.5 ? '1' : '0');
}
