# Knowledge Lattice — Frontend Implementation Guide
### Complete Design System, Interaction Specs & Build Reference

---

## 1. Design Philosophy

**Concept:** A physical research notebook brought to life. The interface feels like you're working *on* paper, not inside a software product. Content doesn't live in boxes — it floats, pins, writes, and connects the way ideas do in a real academic workspace.

**Three core anti-rules:**
1. No cards (no box-shadow + border-radius + padding stacked layouts)
2. No gradients (solid colors only — ink, paper, teal, amber)
3. No colored borders (borders are either hairline ink rules or absent)

**The unforgettable thing:** Text literally typewriters itself onto ruled notebook lines as you scroll. Projects are draggable pinned paper notes, not listed items. The lattice is a person, not decoration.

---

## 2. Color System

All colors defined as CSS custom properties on `:root`.

```css
:root {
  /* Paper surfaces */
  --paper:        #F2EDE4;   /* Primary background — warm off-white */
  --paper-dark:   #E8E0D0;   /* Slightly deeper warm paper */
  --paper-pin:    #EAE0CA;   /* Sun-kissed pinned notes */
  --paper-ruled:  #EDE6D6;   /* Ruled paper section */

  /* Ink (text & structure) */
  --ink:          #1a1a18;   /* Near-black, warm undertone — primary text */
  --ink-mid:      #3d3d38;   /* Secondary text, paragraph body */
  --ink-faint:    #7a7a6e;   /* Metadata, labels, mono captions */

  /* Accent: teal ink */
  --teal-ink:     #2A7C75;   /* Primary accent — links, active nodes, progress */
  --teal-faint:   rgba(42, 124, 117, 0.12);  /* Hover tints, rule lines */
  --teal-pulse:   rgba(42, 124, 117, 0.55);  /* Active edge highlights */

  /* Accent: amber */
  --amber:        #C17F24;   /* Handwritten annotations, margin line, tape */
  --amber-faint:  rgba(193, 127, 36, 0.3);   /* Tape triangle, subtle marks */

  /* Functional */
  --line:         rgba(26, 26, 24, 0.08);    /* Hairline dividers */
  --line-mid:     rgba(26, 26, 24, 0.12);    /* Slightly more visible rules */
  --shadow-pin:   2px 4px 18px rgba(26,26,24,0.12), 0 1px 3px rgba(26,26,24,0.08);
  --shadow-lift:  6px 16px 40px rgba(26,26,24,0.18), 0 2px 6px rgba(26,26,24,0.10);
}
```

### Color Usage Rules

| Color | Used for | Never use for |
|-------|----------|---------------|
| `--paper` | Page background, nav bg | Text |
| `--paper-pin` | Pinned notes, paper components | Dividers |
| `--ink` | H1–H3, logo, labels | Backgrounds |
| `--ink-mid` | Body copy, paragraphs | Primary headings |
| `--ink-faint` | Mono captions, metadata, timestamps | Body text |
| `--teal-ink` | Active state, italic accents, node fill, progress bars, links | Backgrounds, borders |
| `--amber` | Handwritten italic annotations, margin line, tape | Body text, headings |

---

## 3. Typography

### Font Stack

```css
/* Display — for large headings, section titles, editorial moments */
font-family: 'Instrument Serif', serif;
/* Source: Google Fonts — supports italic which is used heavily */

/* Counter / hero numbers */
font-family: 'Bebas Neue', sans-serif;
/* Source: Google Fonts — condensed, industrial editorial weight */

/* Body / serif copy */
font-family: 'Libre Baskerville', Georgia, serif;
/* Source: Google Fonts — traditional, readable, academic feel */

/* Monospaced labels, nav, captions, metadata */
font-family: 'DM Mono', monospace;
/* Source: Google Fonts — clean, technical, low-contrast mono */
```

### Google Fonts Import
```html
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Instrument+Serif:ital@0;1&family=Bebas+Neue&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet">
```

### Type Scale

```css
/* Hero headline */
.hero-h1 {
  font-family: 'Instrument Serif', serif;
  font-size: clamp(3.8rem, 7vw, 7rem);
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--ink);
}
/* Italic accent within headline */
.hero-h1 .italic {
  font-style: italic;
  color: var(--teal-ink);
}

/* Section titles */
.section-title {
  font-family: 'Instrument Serif', serif;
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 400;
  line-height: 1.1;
  color: var(--ink);
}
.section-title em {
  font-style: italic;
  color: var(--teal-ink);
}

/* Stat counters */
.stat-num {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(4rem, 9vw, 9rem);
  line-height: 0.88;
  letter-spacing: -0.02em;
  color: var(--ink);
}

/* Body text */
.body-copy {
  font-family: 'Libre Baskerville', serif;
  font-size: 0.95rem;
  line-height: 1.85;
  color: var(--ink-mid);
}

/* Mono caption / label (eyebrow, section-label, nav links) */
.mono-label {
  font-family: 'DM Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

/* Handwritten annotation (amber italic) */
.annotation {
  font-family: 'Instrument Serif', serif;
  font-style: italic;
  font-size: 0.9rem;
  color: var(--amber);
  line-height: 2rem; /* must match ruled line height */
}

/* Pin item title */
.pin-title {
  font-family: 'Instrument Serif', serif;
  font-size: 1rem;
  line-height: 1.4;
  color: var(--ink);
}

/* Pin body */
.pin-body {
  font-family: 'Libre Baskerville', serif;
  font-size: 0.78rem;
  line-height: 1.65;
  color: var(--ink-mid);
}
```

### Typography Rules

- **Italic is meaning, not decoration.** Use italic (Instrument Serif italic) for: key nouns in headlines, handwritten annotations, blockquotes, researcher names.
- **Mono is metadata, not content.** DM Mono only for labels, timestamps, nav links, section eyebrows, pin footers — never paragraphs.
- **Never bold body copy.** Weight contrast comes from font-family switch (serif vs mono), not `font-weight`.
- **Line height on ruled sections:** Always `2rem` (32px) to stay aligned with the repeating-linear-gradient ruling.

---

## 4. Layout System

### Grid

The layout is **asymmetric and intentional** — not a 12-column grid system.

```
Hero:              2 columns — [text 1fr] [canvas 1fr]
Stat Strip:        4 items, space-between, dividers between
Paper Section:     Single column, left-padded for margin line
Constellation:     Full width, SVG fills container
Pinboard:          position: relative container, children position: absolute
Quote Section:     2 columns — [quote 1fr] [researcher roll 1fr]
CTA:               2 columns — [text 1fr] [buttons auto]
```

### Spacing Scale

Rather than a strict spacing scale, use these intentional values:

```css
/* Section padding */
padding: 6rem 3rem;        /* Standard section */
padding: 5rem 0;           /* Full-bleed section */
padding: 7rem 3rem;        /* Hero-adjacent sections */

/* Inner padding (paper section) */
padding: 5rem 4rem 5rem 8rem;  /* Right content area with left margin space */

/* Gap between elements */
gap: 5rem;    /* Major layout splits */
gap: 2rem;    /* Between related sections */
gap: 1.2rem;  /* Between list items */
gap: 0.6rem;  /* Between tags/chips */
```

### Key Layout Principle: Pinboard

The pinboard is **NOT a grid**. Children are positioned absolutely with pre-set rotations:

```css
.pinboard {
  position: relative;
  min-height: 600px;
  /* On mobile: min-height: 1400px */
}

.pin-item {
  position: absolute;   /* Free positioning within parent */
  max-width: 280px;
  transform-origin: top center;
  /* Pre-set starting positions via .pin-1 through .pin-6 classes */
}

/* Desktop starting positions */
.pin-1 { top: 30px;  left: 2%;   transform: rotate(-2.5deg); }
.pin-2 { top: 10px;  left: 26%;  transform: rotate(1.8deg);  }
.pin-3 { top: 50px;  left: 52%;  transform: rotate(-1.2deg); }
.pin-4 { top: 20px;  right: 2%;  transform: rotate(2deg);    }
.pin-5 { top: 310px; left: 8%;   transform: rotate(1.5deg);  }
.pin-6 { top: 290px; left: 38%;  transform: rotate(-2deg);   }
```

---

## 5. Component Specifications

### 5.1 Navigation

```
Height:       auto (~52px)
Position:     fixed, top: 0
Background:   rgba(248,247,244,0.82) with backdrop-filter: blur(14px)
Bottom edge:  none (uses mix-blend-mode: multiply to feel natural on paper)
Logo font:    Bebas Neue, 1.3rem, letter-spacing: 0.18em
Logo sup:     DM Mono, 0.5rem, opacity: 0.5 — "lattice" in superscript
Nav links:    DM Mono, 0.7rem, letter-spacing: 0.12em, uppercase, var(--ink-mid)
Nav hover:    color → var(--teal-ink), no underline
CTA button:   background: var(--ink), color: var(--paper), no border-radius
CTA hover:    background: var(--teal-ink)
```

### 5.2 Hero Canvas — Node Behavior (UPDATED SPEC)

The hero canvas occupies the right half of the hero section. All nodes:

**Movement:**
- Each node has a base velocity `vx`, `vy` initialised to `(Math.random()-0.5) * 0.18`
- Velocity is damped each frame: `vx *= 0.995` (very gentle — this keeps drift slow)
- Nodes bounce off canvas edges softly
- No mouse attraction in ambient mode — nodes move purely on their own
- Speed range: `0.08 – 0.22 px/frame` so movement is barely perceptible

**Pulsation:**
- Each node has a `phase` (random 0–2π) and a `speed` (random 0.006–0.018)
- Radius oscillates: `r = baseR + Math.sin(t * speed * 60 + phase) * 1.2`
- Opacity oscillates independently: `alpha = 0.4 + Math.sin(t * speed * 45 + phase) * 0.18`
- The combination of different phases and speeds means no two nodes pulse in sync — it reads as organic/alive

**Exact node init:**
```js
{
  x: 30 + Math.random() * (W - 60),
  y: 30 + Math.random() * (H - 60),
  vx: (Math.random() - 0.5) * 0.18,
  vy: (Math.random() - 0.5) * 0.18,
  baseR: Math.random() * 3.5 + 2.5,     // 2.5 – 6px
  phase: Math.random() * Math.PI * 2,
  pulseSpeed: Math.random() * 0.012 + 0.006,
  opPhase: Math.random() * Math.PI * 2, // separate phase for opacity
  active: Math.random() > 0.55,          // teal vs ink-grey
  pulsing: false,   // click-triggered state
  pulseT: 0,
}
```

**Per-frame draw:**
```js
function drawNode(n, t) {
  const r = n.baseR + Math.sin(t * n.pulseSpeed * 60 + n.phase) * 1.2;
  const alpha = 0.38 + Math.sin(t * n.pulseSpeed * 45 + n.opPhase) * 0.18;

  if (n.active) {
    ctx.fillStyle = `rgba(42, 124, 117, ${alpha + 0.15})`;
  } else {
    ctx.fillStyle = `rgba(26, 26, 24, ${alpha - 0.1})`;
  }

  ctx.beginPath();
  ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
  ctx.fill();
}
```

**Edge draw (between nodes):**
```js
// Only draw edge if dist < 150px
const alpha = (1 - dist / 150) * 0.11; // very faint — ink, not teal
ctx.strokeStyle = `rgba(26, 26, 24, ${alpha})`;
ctx.lineWidth = 0.6;
```

**Interaction:**
- **Drag:** `mousedown` within `r + 8px` of node sets `dragIdx`. `mousemove` repositions. `mouseup` releases.
- **Click:** Triggers a `pulseT` wave that radiates through connected nodes with staggered delays.
- **Hover:** Show node name label (dark pill, monospace text) fading in smoothly. Edges to this node highlight in teal.

### 5.3 Ruled Paper Section

The ruled paper section is a full-width `<section>` with:

```css
/* Horizontal ruling every 32px */
background-image: repeating-linear-gradient(
  transparent,
  transparent 31px,
  rgba(42, 124, 117, 0.12) 31px,
  rgba(42, 124, 117, 0.12) 32px
);

/* Vertical margin line */
position: absolute;
top: 0; bottom: 0;
left: 5.5rem;
width: 1px;
background: rgba(193, 127, 36, 0.3);
```

**Content padding:** `padding: 5rem 4rem 5rem 8rem` — the extra left padding keeps content right of the margin line.

**Vertical label:** A `writing-mode: vertical-rl; transform: rotate(180deg)` mono label in the margin.

**Typewriter effect:** Triggered by IntersectionObserver when section enters viewport.

```js
function typeInto(el, text, delay, charSpeed, onDone) {
  let i = 0;
  setTimeout(() => {
    const iv = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) { clearInterval(iv); if (onDone) onDone(); }
    }, charSpeed);
  }, delay);
}

// Each line waits for the previous to finish + a small breath pause
const breathPause = 180; // ms between lines
const charSpeed = 38;    // ms per character — feels deliberate, not robotic
const noteSpeed = 28;    // slightly faster for the annotation
const listSpeed = 22;    // fastest for the numbered list
```

**Line height alignment:** Every typewriter line, the annotation, and each list item must be exactly `height: 2rem; line-height: 2rem` to align with the 32px ruling.

### 5.4 Pinboard — Draggable Pin Items (UPDATED SPEC)

The pinboard is a `position: relative` container. Each pin item is `position: absolute`, draggable within the bounds of the container.

**Visual anatomy of a pin:**
```
         ▲  (tape triangle — CSS clip-path, amber 45% opacity)
    ┌─────────────────────┐
    │  ▒▒▒▒ (ruled lines)  │
    │  TYPE                │
    │  Title text here     │
    │  Body description... │
    │  ████████░░ (bar)    │
    │  3 researchers  72%  │
    └─────────────────────┘
    Box-shadow: layered, no color
    Background: #EAE0CA (sun-kissed paper)
```

**CSS for pin:**
```css
.pin-item {
  position: absolute;
  background: #EAE0CA;
  padding: 1.8rem 1.6rem 2rem;
  max-width: 280px;
  transform-origin: top center;
  box-shadow:
    2px 4px 18px rgba(26,26,24,0.12),
    0 1px 3px rgba(26,26,24,0.08);
  user-select: none;
  will-change: transform;
  cursor: grab;
  transition: box-shadow 0.3s;
}
.pin-item.dragging {
  cursor: grabbing;
  box-shadow:
    8px 24px 60px rgba(26,26,24,0.22),
    0 4px 12px rgba(26,26,24,0.12);
  z-index: 100;
  /* Remove transition during drag for instant response */
  transition: box-shadow 0.1s;
}
/* Tape triangle */
.pin-item::before {
  content: '';
  position: absolute;
  top: -18px; left: 50%;
  transform: translateX(-50%);
  width: 36px; height: 18px;
  background: rgba(193, 127, 36, 0.45);
  clip-path: polygon(0% 100%, 50% 0%, 100% 100%);
}
/* Ruled lines overlay */
.pin-item::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    transparent, transparent 23px,
    rgba(42,124,117,0.07) 23px,
    rgba(42,124,117,0.07) 24px
  );
  pointer-events: none;
}
```

**Drag implementation (JS):**
```js
function initPinDrag() {
  const board = document.getElementById('pinboard');
  const pins = board.querySelectorAll('.pin-item');

  pins.forEach(pin => {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    let currentRotation = parseFloat(pin.dataset.rotation || 0);

    // On mousedown: record start position
    pin.addEventListener('mousedown', e => {
      isDragging = true;
      pin.classList.add('dragging');

      // Remove CSS transition for position during drag
      pin.style.transition = 'box-shadow 0.1s';

      // Current position from style (or computed)
      startX = e.clientX;
      startY = e.clientY;
      startLeft = pin.offsetLeft;
      startTop = pin.offsetTop;

      // Bring to top
      pins.forEach(p => p.style.zIndex = '1');
      pin.style.zIndex = '100';

      // Neutralise rotation slightly when picked up
      pin.style.transform = `rotate(${currentRotation * 0.3}deg) scale(1.03)`;

      e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = startLeft + dx;
      let newTop = startTop + dy;

      // Constrain within pinboard
      const boardRect = board.getBoundingClientRect();
      const pinW = pin.offsetWidth;
      const pinH = pin.offsetHeight;
      newLeft = Math.max(0, Math.min(boardRect.width - pinW, newLeft));
      newTop = Math.max(0, Math.min(board.offsetHeight - pinH, newTop));

      pin.style.left = newLeft + 'px';
      pin.style.top = newTop + 'px';
    });

    window.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      pin.classList.remove('dragging');
      // Restore rotation with transition
      pin.style.transition = 'transform 0.35s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s';
      pin.style.transform = `rotate(${currentRotation}deg)`;
    });

    // Touch support
    pin.addEventListener('touchstart', e => {
      const t = e.touches[0];
      isDragging = true;
      pin.classList.add('dragging');
      startX = t.clientX; startY = t.clientY;
      startLeft = pin.offsetLeft; startTop = pin.offsetTop;
      pins.forEach(p => p.style.zIndex = '1');
      pin.style.zIndex = '100';
      pin.style.transform = `rotate(${currentRotation * 0.3}deg) scale(1.03)`;
    }, { passive: true });

    pin.addEventListener('touchmove', e => {
      if (!isDragging) return;
      const t = e.touches[0];
      const dx = t.clientX - startX, dy = t.clientY - startY;
      let newLeft = Math.max(0, startLeft + dx);
      let newTop = Math.max(0, startTop + dy);
      pin.style.left = newLeft + 'px';
      pin.style.top = newTop + 'px';
    }, { passive: true });

    pin.addEventListener('touchend', () => {
      isDragging = false;
      pin.classList.remove('dragging');
      pin.style.transition = 'transform 0.35s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s';
      pin.style.transform = `rotate(${currentRotation}deg)`;
    });
  });
}
```

**Initial rotation values (store in `data-rotation`):**
```html
<div class="pin-item pin-1" data-rotation="-2.5">...</div>
<div class="pin-item pin-2" data-rotation="1.8">...</div>
<div class="pin-item pin-3" data-rotation="-1.2">...</div>
<div class="pin-item pin-4" data-rotation="2.0">...</div>
<div class="pin-item pin-5" data-rotation="1.5">...</div>
<div class="pin-item pin-6" data-rotation="-2.0">...</div>
```

**Progress bar inside pin:**
```css
.pin-progress {
  margin-top: 0.8rem;
  height: 2px;
  background: rgba(26,26,24,0.1);
  position: relative;
  z-index: 2;
  overflow: hidden;
}
.pin-progress-fill {
  height: 100%;
  background: var(--teal-ink); /* solid color — no gradient */
  transform-origin: left;
  transform: scaleX(0);
  transition: transform 1s cubic-bezier(.4,0,.2,1);
}
.pin-progress-fill.active { transform: scaleX(1); }
```

### 5.5 Constellation SVG

The constellation is an inline `<svg viewBox="0 0 900 480">`. All elements created with `document.createElementNS`.

**Node tiers:**
- Tier 1 (featured): `r=8`, `fill: rgba(42,124,117,0.75)` — full teal
- Tier 2 (standard): `r=5`, `fill: rgba(26,26,24,0.22)` — ink-grey

**Hover state:**
- Node: `r += 3`, `fill → rgba(42,124,117,0.9)`
- Pulse ring: SVG `<circle>` with `fill: rgba(42,124,117,0.1)`, `r` transitions 14→22
- Connected edges: `stroke → rgba(42,124,117,0.55)`, `stroke-width: 1.5`
- Tooltip: absolute positioned `<div>` over SVG, dark ink background, no border

**Tooltip:**
```css
.researcher-tooltip {
  position: absolute;
  background: var(--ink);
  color: var(--paper);
  padding: 0.7rem 1rem;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  /* NO border-radius, NO border, NO shadow color */
}
.researcher-tooltip h4 { font-family: 'Instrument Serif', serif; font-weight: 400; }
.researcher-tooltip p  { font-family: 'DM Mono', monospace; font-size: 0.6rem; opacity: 0.55; }
```

**Click — ping wave:**
```js
// On node click: get all connected nodes, fire with delay proportional to distance
connected.forEach((ci, idx) => {
  const dist = Math.hypot(nodes[ci].x - clickedNode.x, nodes[ci].y - clickedNode.y);
  const delay = (dist / maxEdgeDist) * 400; // 0–400ms based on proximity
  setTimeout(() => triggerPulse(nodes[ci]), delay);
});
```

### 5.6 Researcher Roll (Quote section)

Simple list — no cards. Each row:
```
[01]  Dr. Name Here          FIELD ·
```

```css
.researcher-roll-item {
  display: grid;
  grid-template-columns: 2.5rem 1fr auto;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(26,26,24,0.07); /* hairline only */
  cursor: default;
  transition: background 0.15s;
}
.researcher-roll-item:hover {
  background: rgba(42, 124, 117, 0.04); /* barely-there teal tint */
}
/* A small teal dot appears on hover — the only colored element */
.roll-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--teal-ink);
  opacity: 0;
  transition: opacity 0.2s;
}
.researcher-roll-item:hover .roll-dot { opacity: 1; }
```

### 5.7 Custom Cursor

Two elements: a small filled dot that follows the mouse instantly, and a larger ring that lags behind using linear interpolation.

```js
let mx = 0, my = 0;   // actual mouse
let rx = 0, ry = 0;   // ring position (lags)

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  dot.style.left = mx + 'px';
  dot.style.top  = my + 'px';
});

function animCursor() {
  rx += (mx - rx) * 0.12;  // lerp factor — lower = more lag
  ry += (my - ry) * 0.12;
  ring.style.left = rx + 'px';
  ring.style.top  = ry + 'px';
  requestAnimationFrame(animCursor);
}
animCursor();
```

```css
#cursor {
  position: fixed;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--teal-ink);
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  mix-blend-mode: multiply; /* blends naturally with paper bg */
}
#cursor-ring {
  position: fixed;
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 1px solid var(--teal-ink);
  pointer-events: none;
  z-index: 9998;
  transform: translate(-50%, -50%);
  opacity: 0.5;
}
/* Expand on interactive elements */
/* cursor: 18px, ring: 48px */
```

---

## 6. Animation System

### 6.1 Page Load Sequence

Elements fade up with staggered `animation-delay`. All use:
```css
@keyframes inkDrop {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

| Element | Delay |
|---------|-------|
| Hero eyebrow | 0.2s |
| Hero H1 | 0.4s |
| Hero body | 0.7s |
| Hero search | 0.9s |
| Hero tags | 1.1s |
| Canvas hint | 1.5s |

### 6.2 Scroll Reveal

```js
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
```

```css
.reveal-up {
  opacity: 0;
  transform: translateY(28px);
  transition:
    opacity 0.9s cubic-bezier(.4,0,.2,1),
    transform 0.9s cubic-bezier(.4,0,.2,1);
}
.reveal-up.in { opacity: 1; transform: none; }
.delay-1 { transition-delay: 0.10s; }
.delay-2 { transition-delay: 0.22s; }
.delay-3 { transition-delay: 0.38s; }
```

### 6.3 Counter Animation

```js
function animateCount(el) {
  const target = parseInt(el.dataset.target);
  const duration = 1600;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);  // cubic ease-out
    const val = Math.floor(ease * target);
    el.textContent = val >= 1000 ? val.toLocaleString() : val;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString();
  }
  requestAnimationFrame(step);
}
```

### 6.4 Progress Bar Trigger

IntersectionObserver on each `.pin-item`. On entry, after 200ms delay:
```js
fill.classList.add('active');
// Which triggers: transform: scaleX(1) via CSS transition
```

### 6.5 Prefers Reduced Motion

Wrap all animations:
```css
@media (prefers-reduced-motion: reduce) {
  .reveal-up {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
  * { animation-duration: 0.01ms !important; }
}
```

---

## 7. Interaction Map

| User Action | Response |
|-------------|----------|
| Move mouse | Cursor dot snaps; ring lerps behind |
| Hover nav link | Color → teal, no underline |
| Hover interactive element | Cursor dot grows to 18px, ring to 48px |
| Type in hero search | Underline turns teal |
| Click search tag | Fills input with tag text |
| Click Search button | All hero nodes pulse in sequence |
| Drag hero canvas node | Node follows mouse, edges stretch with it |
| Click hero canvas node | Ripple wave spreads to connected nodes with staggered delay |
| Hover hero canvas node | Name label appears, connected edges highlight teal |
| Scroll to paper section | Typewriter begins — line by line onto ruled paper |
| Scroll to stats | Counters animate from 0 |
| Hover constellation node | Node grows, tooltip appears, connected edges light up |
| Click constellation node | Ping travels through connections, nodes flash |
| Scroll to pinboard | Progress bars fill on each pin |
| Drag pin item | Pin lifts (heavier shadow), rotation neutralises, moves freely |
| Release pin item | Pin settles back to its base rotation with spring easing |
| Hover researcher roll item | Row gets barely-there teal tint; teal dot appears |

---

## 8. Responsive Breakpoints

```css
/* Desktop: full two-column hero, all sections full width */
/* Default (>768px) */

@media (max-width: 768px) {
  /* Hero: stack vertically */
  .hero {
    grid-template-columns: 1fr;
    grid-template-rows: auto 300px;
  }
  .hero-left { padding: 7rem 1.5rem 2rem; }

  /* Stat strip: 2x2 wrap */
  .stat-strip { flex-wrap: wrap; gap: 2rem; padding: 3rem 1.5rem; }
  .stat-divider { display: none; }
  .stat-item { width: calc(50% - 1rem); }

  /* Paper section: smaller left padding */
  .paper-inner { padding: 4rem 2rem 4rem 5rem; }
  .paper-section::after { left: 3.5rem; } /* margin line */
  .paper-label { display: none; }

  /* Constellation: shorter height */
  .constellation-wrap { height: 350px; }
  .constellation-header { flex-direction: column; gap: 1rem; }

  /* Pinboard: taller container, 2-column implicit layout via adjusted absolute positions */
  .pinboard { min-height: 1400px; }
  .pin-item { max-width: 220px; }
  /* Re-stack pin positions for mobile */
  .pin-1 { top: 30px;   left: 2%;  }
  .pin-2 { top: 30px;   right: 2%; left: auto; }
  .pin-3 { top: 290px;  left: 2%;  }
  .pin-4 { top: 290px;  right: 2%; left: auto; }
  .pin-5 { top: 580px;  left: 2%;  }
  .pin-6 { top: 580px;  right: 2%; left: auto; }

  /* Quote: single column */
  .quote-section { grid-template-columns: 1fr; gap: 2.5rem; padding: 4rem 1.5rem; }

  /* CTA: single column */
  .cta-section { grid-template-columns: 1fr; padding: 4rem 1.5rem; }
  .cta-actions { flex-direction: row; flex-wrap: wrap; }

  /* Nav: hide links */
  .nav-links { display: none; }

  footer { flex-direction: column; gap: 0.5rem; text-align: center; }
}
```

---

## 9. Section-by-Section Build Order

Build in this sequence — each section is independent:

1. **CSS variables + fonts** — set all variables, import fonts, reset
2. **Nav** — fixed, blur backdrop, logo, links, CTA button
3. **Custom cursor** — two divs, JS lerp loop
4. **Hero layout** — grid, left text column complete
5. **Hero canvas** — init nodes, ambient drift + pulse animation, drag interaction, hover labels
6. **Stat strip** — static HTML, counter JS triggered by IntersectionObserver
7. **Paper section** — ruled CSS background, margin line, typewriter JS
8. **Constellation** — SVG build, node data, edge data, hover/click interactions, tooltip
9. **Pinboard** — absolute positioned pins, tape CSS, drag JS
10. **Quote + Researcher Roll** — static, hairline dividers, hover dot
11. **CTA** — dark background, ghost lattice canvas, two buttons
12. **Footer** — simple flex row
13. **Scroll reveal** — apply `.reveal-up` to all sections, single IntersectionObserver
14. **Reduced motion** — final media query pass

---

## 10. What NOT to Do (Anti-pattern Reference)

| Anti-pattern | Why it's wrong here | Correct approach |
|---|---|---|
| `border-radius: 12px` on content blocks | Reads as "software card" | No border-radius, or use on small elements only (4px max on progress bars) |
| `background: linear-gradient(...)` | Generic AI-tool look | Flat colors only |
| `border: 1px solid rgba(teal, 0.3)` on containers | Looks like SaaS UI | No colored borders; use hairline `rgba(26,26,24,0.08)` rules or nothing |
| `font-family: Inter` or `Space Grotesk` | Overused, no character | Instrument Serif + DM Mono + Libre Baskerville |
| Grid of equal-height same-width boxes | Generic directory layout | Asymmetric, rotated, position:absolute pinboard |
| Gradient buttons | Screams template | Flat `background: var(--ink)` only |
| Colored drop shadows | Adds visual noise | All shadows: `rgba(26,26,24, ...)` — ink-toned only |
| Animation on every element | Exhausting | Purposeful moments: load, scroll-enter, interaction response |
| `transform: translate(-50%,-50%)` centered modals | Generic overlay pattern | Tooltip pins to node in context |
| `box-shadow: 0 0 0 3px var(--teal)` focus ring | Breaks the paper aesthetic | Underline focus on inputs: `border-bottom: 1.5px solid var(--teal-ink)` |

---

## 11. File / Tech Stack

This design is deliberately **framework-agnostic** — pure HTML/CSS/JS in the prototype. For production:

**Recommended stack:**
- **React + Next.js** (App Router) — for routing, SSR, and component reuse
- **Plain CSS Modules or vanilla CSS** — no Tailwind (too generic, hard to control the paper feel)
- **No UI component library** — every component is custom
- **Canvas API** — for hero lattice and CTA ghost lattice
- **Inline SVG** — for constellation (not canvas, because SVG allows per-element interaction)
- **GSAP (optional)** — for typewriter sequencing if more control needed; plain `setInterval` works fine
- **IntersectionObserver** — built-in, no library needed

**Asset checklist:**
- [ ] Google Fonts loaded (`Libre Baskerville`, `Instrument Serif`, `Bebas Neue`, `DM Mono`)
- [ ] No image assets needed — all texture is CSS
- [ ] No icon library needed — SVG inline only where needed (search icon in hero)
- [ ] Cursor: `cursor: none` on `body`, custom JS cursor

---

## 12. Quick Reference Cheatsheet

```
BG:           #F2EDE4  (--paper)
PIN:          #EAE0CA  (--paper-pin)
RULED BG:     #EDE6D6  (--paper-ruled)
INK:          #1a1a18  (--ink)
INK MID:      #3d3d38  (--ink-mid)
INK FAINT:    #7a7a6e  (--ink-faint)
TEAL:         #2A7C75  (--teal-ink)
AMBER:        #C17F24  (--amber)

DISPLAY:      Instrument Serif (italic for accent)
COUNTER:      Bebas Neue
BODY:         Libre Baskerville
MONO:         DM Mono 300/400

HERO:         2-col grid [1fr 1fr]
PINBOARD:     position:relative → children position:absolute
STATS:        flex row, space-between, Bebas Neue numbers

RULING:       repeating-linear-gradient, 32px pitch, rgba(42,124,117,0.12)
MARGIN LINE:  rgba(193,127,36,0.3), left: 5.5rem (desktop) / 3.5rem (mobile)
TAPE:         clip-path: polygon(0% 100%, 50% 0%, 100% 100%), amber 45%

NODE DRIFT:   vx/vy = ±0.18, damp 0.995/frame
NODE PULSE:   sin(t * pulseSpeed * 60 + phase), r ± 1.2px, alpha ± 0.18
TYPEWRITER:   38ms/char titles, 28ms/char annotations, 22ms/char list
COUNTER:      cubic-ease-out, 1600ms duration
```

