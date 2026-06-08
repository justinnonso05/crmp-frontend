'use client';

import { useEffect } from 'react';

const PINS = [
  {
    cls: 'pin-1', rot: '-2.5', type: 'Featured · Multi-team',
    title: 'Protein Folding in High-Temp Environments',
    body: 'Cross-institutional study spanning 6 universities. Thermophilic protein structural integrity under extreme conditions.',
    progress: 72, researchers: 18,
  },
  {
    cls: 'pin-2', rot: '1.8', type: 'Grant Funded',
    title: 'AI Ethics for Developing Economies',
    body: 'Policy collaboration building context-aware frameworks for responsible AI deployment in the Global South.',
    progress: 40, researchers: 7,
  },
  {
    cls: 'pin-3', rot: '-1.2', type: 'Open Collaboration',
    title: 'Urban Green Space & Mental Health',
    body: 'Longitudinal study correlating urban ecology indices with clinical mental wellness metrics across 12 cities.',
    progress: 58, researchers: 11,
  },
  {
    cls: 'pin-4', rot: '2.0', type: 'New Node',
    title: 'Low-cost Spectroscopy for Agriculture',
    body: 'Hardware-first approach to bringing lab-grade diagnostics to smallholder farms in West Africa.',
    progress: 22, researchers: 4,
  },
  {
    cls: 'pin-5', rot: '1.5', type: 'Breakthrough',
    title: 'Coral Reef Regeneration via Electrodeposition',
    body: 'Marine biology meets materials science. Accelerated aragonite formation using low-voltage seawater systems.',
    progress: 89, researchers: 9,
  },
  {
    cls: 'pin-6', rot: '-2.0', type: 'Seeking Collaborators',
    title: 'Decolonising Research Methodology',
    body: 'A humanities & social science initiative challenging Eurocentric epistemic frameworks in academic publishing.',
    progress: 15, researchers: 3,
  },
];

export default function CTASection() {
  // Pin drag
  useEffect(() => {
    const board = document.getElementById('pinboard');
    if (!board) return;
    const pins = board.querySelectorAll<HTMLElement>('.pin-item');
    const cleanups: (() => void)[] = [];

    pins.forEach(pin => {
      let isDragging = false;
      let startX = 0, startY = 0, startLeft = 0, startTop = 0;
      const rot = parseFloat(pin.dataset.rotation || '0');

      const onDown = (e: MouseEvent | TouchEvent) => {
        isDragging = true;
        pin.classList.add('dragging');
        pin.style.transition = 'box-shadow 0.1s';
        
        // Handle both mouse and touch
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        
        startX = clientX; startY = clientY;
        startLeft = pin.offsetLeft; startTop = pin.offsetTop;
        
        // CRITICAL FIX: Right-aligned pins have CSS `right: X%`.
        // If we only update `left` on drag, the element gets squeezed between `left` and `right`.
        // We MUST set right to 'auto' to release the constraint.
        pin.style.right = 'auto';
        pin.style.width = pin.offsetWidth + 'px'; // Lock width so it doesn't change on drag
        
        pins.forEach(p => { p.style.zIndex = '1'; });
        pin.style.zIndex = '100';
        pin.style.transform = `rotate(${rot * 0.3}deg) scale(1.03)`;
        if (e.cancelable) e.preventDefault();
      };
      const onMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        
        const boardRect = board.getBoundingClientRect();
        const newLeft = Math.max(0, Math.min(boardRect.width - pin.offsetWidth,  startLeft + clientX - startX));
        const newTop  = Math.max(0, Math.min(board.offsetHeight - pin.offsetHeight, startTop  + clientY - startY));
        pin.style.left = newLeft + 'px';
        pin.style.top  = newTop  + 'px';
      };
      const onUp = () => {
        if (!isDragging) return;
        isDragging = false;
        pin.classList.remove('dragging');
        pin.style.transition = 'transform 0.35s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s';
        pin.style.transform  = `rotate(${rot}deg)`;
      };

      pin.addEventListener('mousedown', onDown);
      pin.addEventListener('touchstart', onDown, { passive: false });
      
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, { passive: false });
      
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchend', onUp);
      
      cleanups.push(() => {
        pin.removeEventListener('mousedown', onDown);
        pin.removeEventListener('touchstart', onDown);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchend', onUp);
      });
    });

    return () => cleanups.forEach(fn => fn());
  }, []);

  // Progress bar fill on scroll
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const fill = e.target.querySelector<HTMLElement>('.pin-progress-fill');
        if (fill) setTimeout(() => fill.classList.add('active'), 200);
        io.unobserve(e.target);
      });
    }, { threshold: 0.18 });
    document.querySelectorAll('.pin-item').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="pinboard-section" id="projects">
      <h2 className="pinboard-title reveal-up">
        ACTIVE<br /><span>RESEARCH</span>
      </h2>
      <div className="pinboard" id="pinboard">
        {PINS.map(pin => (
          <div key={pin.cls} className={`pin-item ${pin.cls}`} data-rotation={pin.rot}>
            <div className="pin-type">{pin.type}</div>
            <div className="pin-title">{pin.title}</div>
            <div className="pin-body">{pin.body}</div>
            <div className="pin-progress">
              <div className="pin-progress-fill" style={{ width: `${pin.progress}%` }} />
            </div>
            <div className="pin-footer">
              <span>{pin.researchers} researchers</span>
              <span>{pin.progress}%</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
