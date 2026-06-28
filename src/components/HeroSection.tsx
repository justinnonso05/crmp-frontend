'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { DISCOVERY } from '@/lib/endpoints';

const HERO_NAMES = [
  'Dr. A. Okafor', 'Prof. S. Lohmann', 'J. Mensah', 'Dr. Y. Tanaka',
  'Dr. P. Mehta', 'C. Eze', 'Prof. I. Ferreira', 'Dr. R. Singh',
  'K. Yamamoto', 'Dr. L. Boateng', 'M. Osei', 'Prof. Z. Ali',
  'Dr. B. Costa', 'S. Nakamura', 'Dr. F. Müller', 'T. Ibrahim',
];

const TAGS = ['AI in Healthcare', 'Sustainable Energy', 'Quantum Computing', 'Educational Psychology', 'Urban Planning'];

type CanvasNode = {
  x: number; y: number;
  // Sine-driven velocity — never decays
  vxPhase: number; vyPhase: number;
  vxFreq: number; vyFreq: number;
  speed: number;
  baseR: number; phase: number; pulseSpeed: number; opPhase: number;
  breathePhase: number; breatheSpeed: number;
  name: string; active: boolean; pulsing: boolean; pulseT: number;
};

export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodesRef = useRef<CanvasNode[]>([]);
  const [searchResult, setSearchResult] = useState<{ query: string; count: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const triggerSearchWave = () => {
    const nodes = nodesRef.current;
    if (!nodes.length) return;
    const origin = nodes[Math.floor(Math.random() * nodes.length)];
    const delays = nodes.map(n => Math.hypot(n.x - origin.x, n.y - origin.y) * 2.2);
    delays.forEach((delay, i) => {
      setTimeout(() => { 
        if (nodes[i]) {
          nodes[i].pulsing = true; 
          nodes[i].pulseT = 0; 
        }
      }, delay);
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let W = 0, H = 0;
    let dragIdx = -1, dragOffX = 0, dragOffY = 0;
    let hMouse = { x: -1, y: -1 };
    const hoverLabel = { text: '', x: 0, y: 0, alpha: 0, targetAlpha: 0 };
    let hoverIdx = -1;
    let raf: number;

    function init() {
      const rect = canvas!.getBoundingClientRect();
      const newW = Math.round(rect.width) || 600;
      const newH = Math.round(rect.height) || 600;
      if (newW < 10 || newH < 10) return;
      
      // If canvas already has nodes, just update dims and clamp positions
      if (nodesRef.current.length > 0) {
        if (W !== newW || H !== newH) {
          W = canvas!.width = newW;
          H = canvas!.height = newH;
          nodesRef.current.forEach(n => {
            n.x = Math.max(8, Math.min(W - 8, n.x));
            n.y = Math.max(8, Math.min(H - 8, n.y));
          });
        }
        return;
      }

      W = canvas!.width = newW;
      H = canvas!.height = newH;
      const count = Math.max(14, Math.min(22, Math.floor(W * H / 12000)));
      for (let i = 0; i < count; i++) {
        nodesRef.current.push({
          x: 40 + Math.random() * (W - 80),
          y: 40 + Math.random() * (H - 80),
          // Sine-driven velocity — unique phase/freq per node
          vxPhase: Math.random() * Math.PI * 2,
          vyPhase: Math.random() * Math.PI * 2,
          vxFreq: 0.18 + Math.random() * 0.22,   // slow: ~0.18–0.40 rad/s
          vyFreq: 0.15 + Math.random() * 0.20,
          speed: 0.35 + Math.random() * 0.35,   // px/frame magnitude
          baseR: Math.random() * 3 + 3,
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.008 + 0.004,
          opPhase: Math.random() * Math.PI * 2,
          breathePhase: Math.random() * Math.PI * 2,
          breatheSpeed: Math.random() * 0.004 + 0.003,
          name: HERO_NAMES[i % HERO_NAMES.length],
          active: Math.random() > 0.45,
          pulsing: false, pulseT: 0,
        });
      }
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, W, H);
      const nodes = nodesRef.current;
      const maxDist = 160;

      // Hover detection
      hoverIdx = -1;
      if (hMouse.x >= 0) {
        let minD = 99;
        for (let i = 0; i < nodes.length; i++) {
          const d = Math.hypot(hMouse.x - nodes[i].x, hMouse.y - nodes[i].y);
          if (d < 44 && d < minD) { minD = d; hoverIdx = i; }
        }
      }
      hoverLabel.targetAlpha = hoverIdx >= 0 ? 1 : 0;
      if (hoverIdx >= 0) {
        hoverLabel.text = nodes[hoverIdx].name;
        hoverLabel.x = nodes[hoverIdx].x;
        hoverLabel.y = nodes[hoverIdx].y;
      }
      hoverLabel.alpha += (hoverLabel.targetAlpha - hoverLabel.alpha) * 0.1;

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < maxDist) {
            const isHov = (i === hoverIdx || j === hoverIdx);
            const isPulsing = a.pulsing || b.pulsing;
            let alpha = (1 - d / maxDist) * (isHov ? 0.65 : 0.12);
            if (isPulsing) alpha = Math.max(alpha, 0.55);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = isHov || isPulsing
              ? `rgba(42,124,117,${alpha})`
              : `rgba(26,26,24,${alpha})`;
            ctx.lineWidth = isHov ? 1.5 : 0.7;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        // Move with sine-driven perpetual velocity
        if (i !== dragIdx) {
          // Velocity comes from sine wave — NEVER decays to zero
          const vx = Math.sin(t * n.vxFreq + n.vxPhase) * n.speed;
          const vy = Math.cos(t * n.vyFreq + n.vyPhase) * n.speed;
          n.x += vx; n.y += vy;
          // Soft boundary — reflect phase so motion reverses smoothly near edges
          if (n.x < 12) n.vxPhase = Math.PI - n.vxPhase;
          if (n.x > W - 12) n.vxPhase = Math.PI - n.vxPhase;
          if (n.y < 12) n.vyPhase = -n.vyPhase;
          if (n.y > H - 12) n.vyPhase = -n.vyPhase;
          n.x = Math.max(8, Math.min(W - 8, n.x));
          n.y = Math.max(8, Math.min(H - 8, n.y));
        }
        if (n.pulsing) { n.pulseT += 0.055; if (n.pulseT > 1) n.pulsing = false; }

        // Breathe = slow oscillation of radius (+/- 2.5px)
        const breathe = Math.sin(t * n.breatheSpeed * 60 + n.breathePhase) * 2.5;
        // Pulse = faster flicker
        const pulse = Math.sin(t * n.pulseSpeed * 60 + n.phase) * 1.4;
        const alpha = 0.4 + Math.sin(t * n.pulseSpeed * 45 + n.opPhase) * 0.2;
        const isHov = i === hoverIdx;
        const expandPulse = n.pulsing ? Math.sin(n.pulseT * Math.PI) * 6 : 0;
        const r = Math.max(1, n.baseR + breathe + pulse + (isHov ? 4 : 0) + expandPulse);

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        if (n.active || isHov) {
          ctx.fillStyle = isHov
            ? 'rgba(42,124,117,0.95)'
            : `rgba(42,124,117,${alpha + 0.15})`;
        } else {
          ctx.fillStyle = `rgba(26,26,24,${Math.max(0, alpha - 0.12)})`;
        }
        ctx.fill();

        // Ripple ring during pulse
        if (n.pulsing) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 18 * n.pulseT, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(42,124,117,${0.55 * (1 - n.pulseT)})`;
          ctx.lineWidth = 1.2; ctx.stroke();
          // Second outer ring for bigger impact
          if (n.pulseT > 0.2) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, r + 32 * (n.pulseT - 0.2), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(42,124,117,${0.25 * (1 - n.pulseT)})`;
            ctx.lineWidth = 0.7; ctx.stroke();
          }
        }
      }

      // Hover label tooltip
      if (hoverLabel.alpha > 0.01 && hoverIdx >= 0) {
        ctx.save();
        ctx.globalAlpha = hoverLabel.alpha;
        ctx.font = '300 11px "DM Mono", monospace';
        const tw = ctx.measureText(hoverLabel.text).width;
        const px = Math.min(hoverLabel.x + 14, W - tw - 18);
        const py = hoverLabel.y - 16;
        ctx.fillStyle = 'rgba(26,26,24,0.9)';
        ctx.fillRect(px - 6, py - 13, tw + 12, 21);
        ctx.fillStyle = '#F2EDE4';
        ctx.fillText(hoverLabel.text, px, py);
        ctx.restore();
      }
    }

    function loop(t: number) { raf = requestAnimationFrame(loop); draw(t / 1000); }

    // Mouse events
    const onDown = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      const ex = e.clientX - rect.left, ey = e.clientY - rect.top;
      for (let i = 0; i < nodesRef.current.length; i++) {
        if (Math.hypot(ex - nodesRef.current[i].x, ey - nodesRef.current[i].y) < nodesRef.current[i].baseR + 10) {
          dragIdx = i; dragOffX = ex - nodesRef.current[i].x; dragOffY = ey - nodesRef.current[i].y; break;
        }
      }
    };
    const onMove = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      hMouse.x = e.clientX - rect.left; hMouse.y = e.clientY - rect.top;
      if (dragIdx >= 0) {
        nodesRef.current[dragIdx].x = hMouse.x - dragOffX;
        nodesRef.current[dragIdx].y = hMouse.y - dragOffY;
        // No vx/vy to zero — sine motion resumes naturally on release
      }
    };
    const onUp = () => { dragIdx = -1; };
    const onLeave = () => { dragIdx = -1; hMouse.x = -1; hMouse.y = -1; };
    const onClick = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      const ex = e.clientX - rect.left, ey = e.clientY - rect.top;
      for (let i = 0; i < nodesRef.current.length; i++) {
        if (Math.hypot(ex - nodesRef.current[i].x, ey - nodesRef.current[i].y) < nodesRef.current[i].baseR + 12) {
          // Click a node → cascade out from it
          nodesRef.current[i].pulsing = true; nodesRef.current[i].pulseT = 0;
          for (let j = 0; j < nodesRef.current.length; j++) {
            if (j === i) continue;
            const delay = 1.8 * Math.hypot(nodesRef.current[j].x - nodesRef.current[i].x, nodesRef.current[j].y - nodesRef.current[i].y);
            setTimeout(() => { nodesRef.current[j].pulsing = true; nodesRef.current[j].pulseT = 0; }, delay);
          }
          break;
        }
      }
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('click', onClick);

    const ro = new ResizeObserver(() => init());
    ro.observe(canvas.parentElement!);
    const t0 = setTimeout(() => { init(); raf = requestAnimationFrame(loop); }, 60);

    return () => {
      clearTimeout(t0); cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('click', onClick);
    };
  }, []);

  const fillSearch = (text: string) => {
    if (inputRef.current) { inputRef.current.value = text; inputRef.current.focus(); }
  };

  const handleSearch = async () => {
    const q = inputRef.current?.value.trim();
    if (!q) return;
    
    // Trigger wave animation through all nodes from random origin
    triggerSearchWave();
    setIsSearching(true);
    setSearchResult(null);

    try {
      // Allow the animation to play out briefly before showing results
      await new Promise(r => setTimeout(r, 600));
      const data = await apiFetch<{ count: number }>(DISCOVERY.SEARCH_COUNT(q));
      setSearchResult({ query: q, count: data.count });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <section className="hero">
      <div className="hero-left">
        <p className="hero-eyebrow">Collaborative Research Management Platform — </p>

        <h1 className="hero-h1">
          Where<br />
          <span className="italic">research</span><br />
          gets done.
        </h1>

        <p className="hero-body">
          A unified workspace for the full academic research lifecycle — manage projects, collaborate in real time, survey participants, and publish outputs.
        </p>

        <div className="hero-search-row relative">
          <input
            ref={inputRef}
            type="text"
            id="hero-input"
            placeholder="Search a project, researcher, or field…"
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            disabled={isSearching}
          />
          <button type="button" onClick={handleSearch} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchResult && (
          <div className="mt-6 p-4 border rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ borderColor: 'rgba(42,124,117,0.3)', backgroundColor: 'rgba(42,124,117,0.05)' }}>
            <h3 className="text-lg font-medium mb-1" style={{ color: '#1A1A18' }}>
              Found <span style={{ color: '#2A7C75', fontWeight: 'bold' }}>{searchResult.count}</span> public projects matching &quot;{searchResult.query}&quot;
            </h3>
            <p className="text-sm" style={{ color: 'rgba(26,26,24,0.7)' }}>
              Register and verify your university email to join these projects and collaborate.
            </p>
          </div>
        )}

        <div className="hero-tags">
          {TAGS.map(tag => (
            <span key={tag} className="hero-tag-item" onClick={() => fillSearch(tag)}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="hero-right">
        <canvas ref={canvasRef} id="hero-canvas" />
        <p className="canvas-hint">↖ drag · hover · click to connect</p>
      </div>
    </section>
  );
}
