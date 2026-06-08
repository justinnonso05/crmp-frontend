'use client';

import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import StatStrip from '@/components/TrustedBy';
import HowItWorks from '@/components/HowItWorks';
import FeaturesSection from '@/components/FeaturesSection';
import PinboardSection from '@/components/CTASection';
import Footer from '@/components/Footer';

export default function LandingPage() {
  /* ── Custom cursor ── */
  useEffect(() => {
    const dot  = document.getElementById('rh-cursor');
    const ring = document.getElementById('rh-cursor-ring');
    if (!dot || !ring) return;

    let mx = 0, my = 0, rx = 0, ry = 0;
    let raf: number;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    };
    const animRing = () => {
      rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      raf = requestAnimationFrame(animRing);
    };

    document.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(animRing);

    const grow   = () => { dot.style.width  = '18px'; dot.style.height = '18px'; ring.style.width = '48px'; ring.style.height = '48px'; };
    const shrink = () => { dot.style.width  = '10px'; dot.style.height = '10px'; ring.style.width = '32px'; ring.style.height = '32px'; };

    document.querySelectorAll('a, button, .hero-tag-item, .pin-item, .researcher-roll-item').forEach(el => {
      el.addEventListener('mouseenter', grow);
      el.addEventListener('mouseleave', shrink);
    });

    return () => { document.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  /* ── Scroll reveal ── */
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal-up').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div id="rh-cursor" />
      <div id="rh-cursor-ring" />
      <Navbar />
      <main>
        <HeroSection />
        <StatStrip />
        <HowItWorks />
        <FeaturesSection />
        <PinboardSection />
        <Footer />
      </main>
    </>
  );
}
