"use client";

import { useEffect, useRef } from "react";

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  alpha: number;
}

export default function SilkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbsRef = useRef<Orb[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const orbCount = 5;
    const orbs: Orb[] = [];

    for (let i = 0; i < orbCount; i++) {
      orbs.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 2.0,
        vy: (Math.random() - 0.5) * 2.0,
        radius: 150 + Math.random() * 250,
        hue: [325, 340, 350, 310, 335][i],
        alpha: 0.4 + Math.random() * 0.25,
      });
    }
    orbsRef.current = orbs;

    let time = 0;

    const animate = () => {
      time += 0.012;
      ctx.clearRect(0, 0, w, h);

      // Soft radial base that follows viewport center
      const baseGrad = ctx.createRadialGradient(
        w * 0.5, h * 0.5, 0,
        w * 0.5, h * 0.5, Math.max(w, h) * 0.7
      );
      baseGrad.addColorStop(0, "rgba(252, 231, 243, 0.3)");
      baseGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.15)");
      baseGrad.addColorStop(1, "rgba(249, 250, 251, 0.02)");
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, w, h);

      const list = orbsRef.current;
      for (let i = 0; i < list.length; i++) {
        const orb = list[i];

        // Smooth sine-based movement — no jitter
        orb.x += orb.vx + Math.sin(time * 2.3 + orb.hue * 0.1) * 1.6;
        orb.y += orb.vy + Math.cos(time * 2.0 + orb.hue * 0.1) * 1.6;

        // Wrap
        const pad = orb.radius;
        if (orb.x < -pad) orb.x = w + pad;
        if (orb.x > w + pad) orb.x = -pad;
        if (orb.y < -pad) orb.y = h + pad;
        if (orb.y > h + pad) orb.y = -pad;

        const cx = orb.x;
        const cy = orb.y;
        const r = orb.radius;

        // Gentle size pulse
        const pulse = 1 + Math.sin(time * 2.8 + orb.hue) * 0.22;
        const cr = r * pulse;
        const hue = orb.hue;
        const alpha = orb.alpha;

        // Main orb: soft radial gradient
        const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
        g1.addColorStop(0, `hsla(${hue}, 80%, 75%, ${alpha})`);
        g1.addColorStop(0.3, `hsla(${hue}, 70%, 70%, ${alpha * 0.75})`);
        g1.addColorStop(0.6, `hsla(${hue}, 60%, 65%, ${alpha * 0.3})`);
        g1.addColorStop(0.85, `hsla(${hue}, 50%, 60%, ${alpha * 0.06})`);
        g1.addColorStop(1, "transparent");
        ctx.fillStyle = g1;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();

        // Secondary highlight orb — offset for depth
        const sx = cx + Math.cos(time * 1.6 + hue) * r * 0.5;
        const sy = cy + Math.sin(time * 1.8 + hue) * r * 0.5;
        const sr = cr * 0.65;
        const g2 = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
        g2.addColorStop(0, `hsla(${hue + 25}, 70%, 82%, ${alpha * 0.25})`);
        g2.addColorStop(0.5, `hsla(${hue + 25}, 60%, 74%, ${alpha * 0.1})`);
        g2.addColorStop(1, "transparent");
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(animate);
    };

    let rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ filter: "blur(20px)" }}
      aria-hidden="true"
    />
  );
}
