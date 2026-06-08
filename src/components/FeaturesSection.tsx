'use client';

import { useEffect, useRef } from 'react';

const NODES = [
  { name: 'Dr. Ada Okafor',      field: 'Computational Biology · Lagos',  x: 120, y: 240 },
  { name: 'Prof. S. Lohmann',    field: 'Quantum Systems · Munich',        x: 280, y: 100 },
  { name: 'James Mensah',        field: 'Systems Engineering · Landmark',  x: 450, y: 280 },
  { name: 'Dr. Yuki Tanaka',     field: 'Marine Biology · Kyoto',          x: 620, y: 150 },
  { name: 'Dr. Priya Mehta',     field: 'Biomedical AI · Delhi',           x: 780, y: 320 },
  { name: 'Prof. Ines Ferreira', field: 'Ecology · Lisbon',                x: 200, y: 390 },
  { name: 'Dr. Ravi Singh',      field: 'Climate Science · Mumbai',        x: 380, y: 420 },
  { name: 'K. Yamamoto',         field: 'Neuroscience · Osaka',            x: 560, y: 380 },
  { name: 'Dr. L. Boateng',      field: 'Public Health · Accra',           x: 700, y: 420 },
  { name: 'Prof. Z. Ali',        field: 'Mathematics · Cairo',             x: 840, y: 200 },
  { name: 'Dr. B. Costa',        field: 'AI Ethics · São Paulo',           x: 70,  y: 120 },
  { name: 'S. Nakamura',         field: 'Materials Science · Tokyo',       x: 480, y: 60  },
];

const EDGES = [
  [0,1],[0,5],[0,6],[1,2],[1,11],[2,3],[2,6],[3,4],[3,9],[4,9],[4,8],
  [5,6],[6,7],[7,8],[7,2],[8,9],[10,0],[10,5],[11,3],
].filter(([a, b]) => a < NODES.length && b < NODES.length);

export default function FeaturesSection() {
  const svgRef     = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const tip = tooltipRef.current;
    if (!svg || !tip) return;
    const ns = 'http://www.w3.org/2000/svg';

    // Draw edges first
    EDGES.forEach(([ai, bi], ei) => {
      const a = NODES[ai], b = NODES[bi];
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', String(a.x)); line.setAttribute('y1', String(a.y));
      line.setAttribute('x2', String(b.x)); line.setAttribute('y2', String(b.y));
      line.setAttribute('stroke', 'rgba(26,26,24,0.1)');
      line.setAttribute('stroke-width', '1');
      line.dataset.edge = String(ei);
      (line as SVGElement & { style: CSSStyleDeclaration }).style.transition = 'stroke 0.3s, stroke-width 0.3s';
      svg.appendChild(line);
    });

    // Draw nodes
    NODES.forEach((r, i) => {
      const g = document.createElementNS(ns, 'g');
      (g as SVGElement & { style: CSSStyleDeclaration }).style.cursor = 'none';

      const pulse = document.createElementNS(ns, 'circle');
      pulse.setAttribute('cx', String(r.x)); pulse.setAttribute('cy', String(r.y));
      pulse.setAttribute('r', '14'); pulse.setAttribute('fill', 'rgba(42,124,117,0)');
      (pulse as SVGElement & { style: CSSStyleDeclaration }).style.transition = 'r 0.3s, fill 0.3s';
      g.appendChild(pulse);

      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', String(r.x)); circle.setAttribute('cy', String(r.y));
      circle.setAttribute('r', i < 3 ? '8' : '5');
      circle.setAttribute('fill', i < 3 ? 'rgba(42,124,117,0.75)' : 'rgba(26,26,24,0.22)');
      (circle as SVGElement & { style: CSSStyleDeclaration }).style.transition = 'fill 0.25s, r 0.25s';
      g.appendChild(circle);

      g.addEventListener('mouseenter', () => {
        circle.setAttribute('fill', 'rgba(42,124,117,0.9)');
        circle.setAttribute('r', String(parseFloat(circle.getAttribute('r')!) + 3));
        pulse.setAttribute('fill', 'rgba(42,124,117,0.1)'); pulse.setAttribute('r', '22');
        svg.querySelectorAll('line').forEach((ln, ei) => {
          const edge = EDGES[ei];
          if (edge && (edge[0] === i || edge[1] === i)) {
            ln.setAttribute('stroke', 'rgba(42,124,117,0.55)');
            ln.setAttribute('stroke-width', '1.5');
          }
        });
        const svgRect = svg.getBoundingClientRect();
        const wrapRect = svg.parentElement!.getBoundingClientRect();
        const tx = r.x * (svgRect.width / 900) + svgRect.left - wrapRect.left;
        const ty = r.y * (svgRect.height / 480);
        tip.style.left = Math.min(tx + 15, svgRect.width - 230) + 'px';
        tip.style.top  = (ty - 70) + 'px';
        tip.innerHTML  = `<h4>${r.name}</h4><p>${r.field}</p>`;
        tip.classList.add('visible');
      });

      g.addEventListener('mouseleave', () => {
        circle.setAttribute('r', i < 3 ? '8' : '5');
        circle.setAttribute('fill', i < 3 ? 'rgba(42,124,117,0.75)' : 'rgba(26,26,24,0.22)');
        pulse.setAttribute('fill', 'rgba(42,124,117,0)'); pulse.setAttribute('r', '14');
        svg.querySelectorAll('line').forEach(ln => {
          ln.setAttribute('stroke', 'rgba(26,26,24,0.1)'); ln.setAttribute('stroke-width', '1');
        });
        tip.classList.remove('visible');
      });

      g.addEventListener('click', () => {
        const connected = EDGES.filter(([a, b]) => a === i || b === i).map(([a, b]) => a === i ? b : a);
        connected.forEach((ci, idx) => {
          const tG = svg.querySelectorAll('g')[ci];
          const tC = tG?.querySelector('circle:last-child');
          if (!tC) return;
          setTimeout(() => {
            tC.setAttribute('fill', 'rgba(42,124,117,0.9)');
            setTimeout(() => tC.setAttribute('fill', ci < 3 ? 'rgba(42,124,117,0.75)' : 'rgba(26,26,24,0.22)'), 500);
          }, idx * 150);
        });
      });

      svg.appendChild(g);
    });

    return () => { while (svg.firstChild) svg.removeChild(svg.firstChild); };
  }, []);

  return (
    <section className="constellation-section" id="team">
      <div className="constellation-header">
        <div>
          <p className="section-label reveal-up">The Team Network</p>
          <h2 className="section-title reveal-up delay-1">
            A living map of<br /><em>connected minds</em>
          </h2>
        </div>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', color: 'var(--ink-faint)', maxWidth: '220px', lineHeight: '1.7', letterSpacing: '0.05em', alignSelf: 'flex-end' }} className="reveal-up delay-2">
          Hover a node to see who they are.<br />Click to simulate a collaboration ping.
        </p>
      </div>
      <div className="constellation-wrap reveal-up">
        <svg ref={svgRef} id="constellation-svg" viewBox="0 0 900 480" preserveAspectRatio="xMidYMid meet" />
        <div ref={tooltipRef} className="researcher-tooltip" id="tooltip" />
      </div>
    </section>
  );
}
