'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

const ROLL = [
  { index: '01', name: 'Prof. Ada Okafor',    field: 'Biomedical AI'  },
  { index: '02', name: 'Dr. James Mensah',    field: 'Systems Eng.'   },
  { index: '03', name: 'Dr. Yuki Tanaka',     field: 'Marine Biology' },
  { index: '04', name: 'Prof. Priya Mehta',   field: 'Climate Sci.'   },
  { index: '05', name: 'Chukwuemeka Eze',     field: 'AgriTech'       },
  { index: '06', name: 'Prof. Ines Ferreira', field: 'Ecology'        },
];

export default function Footer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    type N = { x: number; y: number; vx: number; vy: number; r: number };
    let nodes: N[] = [];
    let raf: number;

    const init = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = Math.round(rect.width)  || 1200;
      canvas.height = Math.round(rect.height) || 240;
      nodes = Array.from({ length: 30 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 3 + 1.5,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach((n, i) => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        nodes.forEach((m, j) => {
          if (j <= i) return;
          const d = Math.hypot(n.x - m.x, n.y - m.y);
          if (d < 120) {
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y);
            ctx.strokeStyle = `rgba(242,237,228,${(1 - d / 120) * 0.4})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        });
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(242,237,228,0.3)'; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(() => init());
    ro.observe(canvas.parentElement!);
    const t0 = setTimeout(() => { init(); draw(); }, 60);
    return () => { clearTimeout(t0); cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <>
      {/* ── QUOTE + RESEARCHER ROLL ─── */}
      <section className="quote-section" id="about">
        <div className="reveal-up">
          <span className="quote-mark">"</span>
          <blockquote>
            Research Hub gave our team one place to think, plan, and publish together — without the chaos of email threads and version conflicts.
          </blockquote>
          <p className="quote-attr">
            — <strong>Dr. Ada Okafor</strong>, Principal Investigator · University of Lagos
          </p>
        </div>

        <div className="reveal-up delay-1">
          <p className="section-label" style={{ marginBottom: '1.2rem' }}>In the network</p>
          <div className="researcher-roll">
            {ROLL.map(r => (
              <div key={r.index} className="researcher-roll-item">
                <span className="roll-index">{r.index}</span>
                <span className="roll-name">{r.name}</span>
                <span className="roll-field">
                  {r.field}<span className="roll-dot" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA DARK SECTION ─── */}
      <section className="cta-section">
        <canvas ref={canvasRef} id="cta-canvas" />
        <div className="cta-text reveal-up">
          <h2 className="cta-h2">
            Start your research.<br />
            <em>Build something that matters.</em>
          </h2>
          <p className="cta-sub">
            Join your team on Research Hub. Create projects, assign roles, collaborate in real time, and take your work from idea to publication.
          </p>
        </div>
        <div className="cta-actions reveal-up delay-1">
          <Link href="/register" className="btn-ink">Get Started Free →</Link>
          <Link href="/login"    className="btn-ghost">Sign In</Link>
        </div>
      </section>

      {/* ── FOOTER ─── */}
      <footer>
        <span className="footer-logo">Research Hub</span>
        <span className="footer-mono">Collaborative Research Management · CRMP  · 2025</span>
      </footer>
    </>
  );
}
