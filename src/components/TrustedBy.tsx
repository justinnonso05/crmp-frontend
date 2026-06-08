'use client';

import React, { useEffect } from 'react';

const STATS = [
  { value: 4,   label: 'User Roles'       },
  { value: 8,   label: 'Core Modules'     },
  { value: 200, label: 'ms API Latency'   },
  { value: 100, label: '% Real-Time Sync' },
];

function animateCount(el: HTMLElement) {
  const target = parseInt(el.dataset.target || '0');
  const duration = 1600;
  const start = performance.now();
  const step = (now: number) => {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val = Math.floor(ease * target);
    el.textContent = val >= 1000 ? val.toLocaleString() : String(val);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target >= 1000 ? target.toLocaleString() : String(target);
  };
  requestAnimationFrame(step);
}

export default function StatStrip() {
  useEffect(() => {
    let triggered = false;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !triggered) {
          triggered = true;
          document.querySelectorAll<HTMLElement>('.stat-num[data-target]').forEach(animateCount);
          io.disconnect();
        }
      });
    }, { threshold: 0.4 });
    const el = document.querySelector('.stat-strip');
    if (el) io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="stat-strip">
      {STATS.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <div className="stat-divider" />}
          <div className="stat-item reveal-up" style={{ transitionDelay: `${i * 0.1}s` }}>
            <span className="stat-num" data-target={s.value}>0</span>
            <span className="stat-label">{s.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
