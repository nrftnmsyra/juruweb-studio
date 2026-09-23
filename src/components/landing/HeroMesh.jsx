'use client';

import { useEffect, useRef } from 'react';

const SPACING = 44;
const RADIUS = 165;

/**
 * The hero backdrop: a layout grid that ripples on its own and bends toward the
 * pointer. Pauses when scrolled out of view and never starts under reduced motion.
 */
export default function HeroMesh() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    const host = canvas.parentElement;
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let time = 0;
    let mx = -9999;
    let my = -9999;
    let targetX = -9999;
    let targetY = -9999;
    let running = true;
    let frameId = 0;
    const pts = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / SPACING) + 3;
      rows = Math.ceil(height / SPACING) + 3;
    };

    const draw = () => {
      if (!running) return;
      time += 0.0055;
      ctx.clearRect(0, 0, width, height);
      mx += (targetX - mx) * 0.08;
      my += (targetY - my) * 0.08;

      const r2 = RADIUS * RADIUS;
      let k = 0;
      pts.length = 0;
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const x0 = i * SPACING - SPACING;
          const y0 = j * SPACING - SPACING;
          const wave =
            Math.sin(x0 * 0.013 + time * 1.5) * 7 +
            Math.cos(y0 * 0.017 - time * 1.1) * 6 +
            Math.sin((x0 + y0) * 0.009 + time * 0.8) * 5;
          let x = x0;
          let y = y0 + wave;
          const dx = x - mx;
          const dy = y - my;
          const d2 = dx * dx + dy * dy;
          let lift = 0;
          if (d2 < r2) {
            const d = Math.sqrt(d2) || 1;
            const f = 1 - d / RADIUS;
            lift = f * f;
            x += (dx / d) * lift * 30;
            y += (dy / d) * lift * 30;
          }
          pts[k] = x;
          pts[k + 1] = y;
          pts[k + 2] = lift;
          k += 3;
        }
      }

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,102,196,0.10)';
      ctx.beginPath();
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const o = (j * cols + i) * 3;
          if (i === 0) ctx.moveTo(pts[o], pts[o + 1]);
          else ctx.lineTo(pts[o], pts[o + 1]);
        }
      }
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          const o = (j * cols + i) * 3;
          if (j === 0) ctx.moveTo(pts[o], pts[o + 1]);
          else ctx.lineTo(pts[o], pts[o + 1]);
        }
      }
      ctx.stroke();

      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const o = (j * cols + i) * 3;
          const lift = pts[o + 2];
          if (lift > 0.06) {
            ctx.fillStyle = `rgba(255,168,214,${(lift * 0.85).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(pts[o], pts[o + 1], 1 + lift * 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      frameId = requestAnimationFrame(draw);
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      if (mx < -9000) {
        mx = targetX;
        my = targetY;
      }
    };
    const onLeave = () => {
      targetX = -9999;
      targetY = -9999;
    };

    window.addEventListener('resize', resize, { passive: true });
    host?.addEventListener('pointermove', onMove, { passive: true });
    host?.addEventListener('pointerleave', onLeave, { passive: true });

    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        if (visible && !running) {
          running = true;
          draw();
        }
        running = visible;
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    resize();
    draw();

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      io.disconnect();
      window.removeEventListener('resize', resize);
      host?.removeEventListener('pointermove', onMove);
      host?.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="lp-mesh" aria-hidden="true" />;
}
