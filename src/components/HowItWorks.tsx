'use client';

import { useEffect } from 'react';

const TITLE = [
  { id: 'tw1', text: 'Your research,' },
  { id: 'tw2', text: 'managed with'   },
  { id: 'tw3', text: 'precision.'     },
];
const NOTE = '← collaborate, track, and publish from one hub';
const LIST = [
  'Create projects and assign roles across your team',
  'Collaborate in real time with a live document editor',
  'Design and distribute surveys linked to your dataset',
  'Track milestones and receive deadline notifications',
  'Log journal articles, reports, and ethical clearances',
];

function typeInto(el: HTMLElement, text: string, delay: number, speed: number, done?: () => void) {
  let i = 0;
  setTimeout(() => {
    const iv = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) { clearInterval(iv); done?.(); }
    }, speed);
  }, delay);
}

export default function HowItWorks() {
  useEffect(() => {
    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      let delay = 0;
      TITLE.forEach(({ id, text }) => {
        const el = document.getElementById(id);
        if (!el) return;
        typeInto(el, text, delay, 38);
        delay += text.length * 38 + 180;
      });
      const noteEl = document.getElementById('tw-note');
      if (noteEl) typeInto(noteEl, NOTE, delay, 28);
      delay += NOTE.length * 28 + 200;
      const listItems = document.querySelectorAll<HTMLElement>('#paper-list li .tw-text');
      LIST.forEach((txt, i) => {
        if (!listItems[i]) return;
        typeInto(listItems[i], txt, delay, 22);
        delay += txt.length * 22 + 120;
      });
    };
    const section = document.querySelector('.paper-section');
    if (!section) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { trigger(); io.disconnect(); } }, { threshold: 0.18 });
    io.observe(section);
    return () => io.disconnect();
  }, []);

  return (
    <section className="paper-section" id="features">
      <span className="paper-label">How it works</span>
      <div className="paper-inner">
        <h2 className="paper-title">
          {TITLE.map(({ id }) => (
            <span key={id} className="typewriter-line">
              <span className="tw-text" id={id} />
            </span>
          ))}
        </h2>
        <span className="annotation"><span className="tw-text" id="tw-note" /></span>
        <ul className="paper-list" id="paper-list">
          {LIST.map((_, i) => (
            <li key={i}><span><span className="tw-text" /></span></li>
          ))}
        </ul>
      </div>
    </section>
  );
}
