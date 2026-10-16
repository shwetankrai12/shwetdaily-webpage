"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import { siteConfig, SocialLinkItem } from "@/data/site";
import { LinkCards } from "@/components/LinkCards";
import { CableHub } from "@/components/CableHub";

interface Point {
  x: number;
  y: number;
  ox: number;
  oy: number;
}

interface CableData {
  link: SocialLinkItem;
  i: number;
  pts: Point[];
  glow: number;
  act: number;
  plugged: boolean;
  startAt: number;
  hub: { x: number; y: number };
  hubDir: { x: number; y: number };
  end: { x: number; y: number };
  dir: { x: number; y: number };
  rest: number;
  hubWob: number;
  cardWob: number;
  currentEnd?: { x: number; y: number; u: number };
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  c: string;
  r: number;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  c: string;
}

// Procedural Web Audio Synthesizer (Zero external assets, safe user-toggle unlock)
let globalAudioCtx: AudioContext | null = null;

function getAudioContext(enabled: boolean): AudioContext | null {
  if (!enabled || typeof window === "undefined") return null;
  try {
    if (!globalAudioCtx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) globalAudioCtx = new AC();
    }
    if (globalAudioCtx && globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume();
    }
  } catch {
    // Ignore audio context errors gracefully
  }
  return globalAudioCtx;
}

function playSnapSound(idx: number, enabled: boolean) {
  const ac = getAudioContext(enabled);
  if (!ac) return;
  try {
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const baseFreq = [150, 185, 220, 260][idx % 4];
    osc.type = "triangle";
    osc.frequency.setValueAtTime(baseFreq * 2.2, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.065);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  } catch {
    // Ignore audio playback errors
  }
}

function playHoverSound(idx: number, enabled: boolean) {
  const ac = getAudioContext(enabled);
  if (!ac) return;
  try {
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const freq = [440, 554.37, 659.25, 740][idx % 4];
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.25, t + 0.09);
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.11);
  } catch {
    // Ignore audio playback errors
  }
}

function playPluckSound(idx: number, enabled: boolean) {
  const ac = getAudioContext(enabled);
  if (!ac) return;
  try {
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const freq = [110, 138.59, 164.81, 196][idx % 4];
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq * 1.4, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.18);
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.21);
  } catch {
    // Ignore audio playback errors
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function angleDiff(a: number, b: number): number {
  let diff = (a - b) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff <= -Math.PI) diff += Math.PI * 2;
  return diff;
}

function shadeColor(hex: string, factor: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.floor(((n >> 16) & 255) * factor));
  const g = Math.min(255, Math.floor(((n >> 8) & 255) * factor));
  const b = Math.min(255, Math.floor((n & 255) * factor));
  return `rgb(${r},${g},${b})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillStyle: string | CanvasGradient
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function pointAtArc(pts: Point[], cumDist: number[], targetDist: number, totalLen: number) {
  const t = ((targetDist % totalLen) + totalLen) % totalLen;
  let i = 1;
  while (i < pts.length - 1 && cumDist[i] < t) i++;
  const u = (t - cumDist[i - 1]) / (cumDist[i] - cumDist[i - 1] || 1);
  return {
    x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * u,
    y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * u,
  };
}

// Reusable Hardware Connector Plug Renderer for both hub end and card end
function drawPlug(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  color: string,
  isPlugged: boolean,
  isPowered: boolean,
  glow: number,
  S: number,
  isMobile: boolean,
  isHubEnd = false,
  tubeWidth?: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const m = ctx.createLinearGradient(0, -10 * S, 0, 10 * S);
  m.addColorStop(0, "#f4f6f4");
  m.addColorStop(0.4, "#8e9591");
  m.addColorStop(1, "#c8cdca");

  const bGrad = ctx.createLinearGradient(0, -12 * S, 0, 12 * S);
  bGrad.addColorStop(0, "#4f5752");
  bGrad.addColorStop(0.35, "#191d1a");
  bGrad.addColorStop(1, "#050606");

  const bw = tubeWidth || Math.max(6, 12 * S);

  // Tapered strain relief boot: x from -52*S to -38*S, back height = bw, front height = 16*S
  ctx.beginPath();
  ctx.moveTo(-52 * S, -bw / 2);
  ctx.lineTo(-38 * S, -8 * S);
  ctx.lineTo(-38 * S, 8 * S);
  ctx.lineTo(-52 * S, bw / 2);
  ctx.closePath();
  ctx.fillStyle = "#141815";
  ctx.fill();

  // Subtle molded ridges on the boot for realism
  ctx.beginPath();
  const r1w = bw * 0.65 + 16 * S * 0.35;
  ctx.moveTo(-47.5 * S, -r1w / 2);
  ctx.lineTo(-45 * S, -r1w / 2);
  ctx.lineTo(-45 * S, r1w / 2);
  ctx.lineTo(-47.5 * S, r1w / 2);
  ctx.closePath();
  ctx.fillStyle = "#080a09";
  ctx.fill();

  ctx.beginPath();
  const r2w = bw * 0.35 + 16 * S * 0.65;
  ctx.moveTo(-43 * S, -r2w / 2);
  ctx.lineTo(-40.5 * S, -r2w / 2);
  ctx.lineTo(-40.5 * S, r2w / 2);
  ctx.lineTo(-43 * S, r2w / 2);
  ctx.closePath();
  ctx.fillStyle = "#080a09";
  ctx.fill();

  // 1px darker ring (rgba(0,0,0,.45)) at the boot's back edge
  ctx.beginPath();
  ctx.moveTo(-52 * S, -bw / 2);
  ctx.lineTo(-52 * S, bw / 2);
  ctx.lineWidth = Math.max(1, 1.2 * S);
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.stroke();

  // Main connector housing
  roundRect(ctx, -40 * S, -12.5 * S, 28 * S, 25 * S, 5.5 * S, bGrad);
  roundRect(ctx, -38 * S, -9.5 * S, 24 * S, 3.2 * S, 2 * S, "rgba(255,255,255,0.3)");

  // Brand color collar ring
  roundRect(ctx, -16 * S, -11.5 * S, 3.5 * S, 23 * S, 1.2 * S, color);

  // Metallic shield and prongs
  const prongOut = isPlugged ? 0.45 : 1;
  roundRect(ctx, -12 * S, -10 * S, 6 * S, 20 * S, 2 * S, m);
  if (isHubEnd) {
    // Extend prong tips ~6*S px past the jack center into the hub body
    roundRect(ctx, -6 * S, -6.5 * S, 12 * S, 4 * S, 1.5 * S, m);
    roundRect(ctx, -6 * S, 2.5 * S, 12 * S, 4 * S, 1.5 * S, m);
  } else {
    roundRect(ctx, -6 * S, -6.5 * S, 14 * S * prongOut, 4 * S, 1.5 * S, m);
    roundRect(ctx, -6 * S, 2.5 * S, 14 * S * prongOut, 4 * S, 1.5 * S, m);
  }

  // Status LED
  const ledOn = isPowered || isPlugged;
  ctx.save();
  if (ledOn && (!isMobile || glow > 0.5)) {
    ctx.shadowColor = isPowered ? "#39FF14" : color;
    ctx.shadowBlur = 8 * S;
  }
  ctx.fillStyle = isPowered ? "#39FF14" : isPlugged ? color : "#2a2e2b";
  ctx.beginPath();
  ctx.arc(-27 * S, 0, 2.5 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

export const LinkCables: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Filter 2 to 4 active links (hide if url is empty) - memoized so reference remains stable across renders
  const activeLinks = React.useMemo(
    () => siteConfig.links.filter((l) => Boolean(l.url && l.url.trim() !== "")),
    []
  );

  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const [patrolIndex, setPatrolIndex] = useState<number | null>(null);
  const [pluggedMap, setPluggedMap] = useState<Record<number, boolean>>({});
  const [portOrder, setPortOrder] = useState<number[]>(() => activeLinks.map((_, i) => i));
  const [sfxEnabled, setSfxEnabled] = useState(false);
  const [isSurging, setIsSurging] = useState(false);
  const [isAnyActive, setIsAnyActive] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const reducedMotion = Boolean(shouldReduceMotion);

  // Audio ref for event listeners
  const sfxEnabledRef = useRef(sfxEnabled);
  useEffect(() => {
    sfxEnabledRef.current = sfxEnabled;
  }, [sfxEnabled]);

  // Cable state stored in ref for 60fps physics simulation
  const cablesRef = useRef<CableData[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const ringsRef = useRef<Ring[]>([]);
  const dragRef = useRef<{ r: CableData; idx: number } | null>(null);

  // Animation & Layout dimensions
  const dimsRef = useRef({ W: 1000, H: 700, S: 1, dpr: 1, isMobile: false });
  const mouseRef = useRef({ mx: -999, my: -999, pmx: -999, pmy: -999, mvx: 0, mvy: 0 });
  const surgeUntilRef = useRef(0);
  const isVisibleRef = useRef(true);
  const lastWidthRef = useRef(0);
  const lastIsMobileRef = useRef<boolean | null>(null);

  // Spawn visual shockwave and electric sparks
  const spawnSparks = useCallback((x: number, y: number, col: string, count: number, power = 1) => {
    if (reducedMotion) return;
    const { S, isMobile } = dimsRef.current;
    const finalCount = isMobile ? Math.max(4, Math.round(count * 0.5)) : count;
    for (let i = 0; i < finalCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (1.8 + Math.random() * 5.2) * S * power;
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.2 * S,
        life: 1,
        decay: 0.028 + Math.random() * 0.035,
        c: i % 2 === 0 ? "#39FF14" : col,
        r: (1.4 + Math.random() * 2.2) * S,
      });
    }
    ringsRef.current.push({
      x,
      y,
      r: 4 * S,
      maxR: 38 * S * power,
      alpha: 0.85,
      c: col,
    });
  }, [reducedMotion]);

  // Card jolt on snap
  const joltCard = useCallback((idx: number, dir: { x: number; y: number }, strength = 1) => {
    if (reducedMotion || !sectionRef.current) return;
    const cardEl = sectionRef.current.querySelector<HTMLElement>(`[data-link-index="${idx}"]`);
    if (!cardEl) return;
    const { S } = dimsRef.current;
    const jx = (-dir.x * 9 * S * strength).toFixed(1) + "px";
    const jy = (-dir.y * 7 * S * strength).toFixed(1) + "px";
    cardEl.style.setProperty("--jolt-x", jx);
    cardEl.style.setProperty("--jolt-y", jy);
    setTimeout(() => {
      cardEl.style.setProperty("--jolt-x", "0px");
      cardEl.style.setProperty("--jolt-y", "0px");
    }, 160);
  }, [reducedMotion]);

  // Layout calculation
  const updateLayout = useCallback((reinitializePoints = false) => {
    if (!sectionRef.current || !canvasRef.current) return;

    const stRect = sectionRef.current.getBoundingClientRect();
    const W = stRect.width;
    const H = stRect.height;
    if (W === 0 || H === 0) return;

    // Detect mobile viewport (<768px) or landscape mobile (max-height: 500px)
    const isMobileViewport = window.innerWidth < 768 && window.innerHeight > 500;
    const isLandscapePhone = window.innerHeight <= 500 && window.innerWidth >= 500;
    const useSideLayout = !isMobileViewport || isLandscapePhone;

    let S = W / 1000;
    if (isMobileViewport) S = W / 560;

    const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
    const dprCap = isMobileViewport ? (cores <= 4 ? 1.5 : 1.75) : 2.0;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);

    dimsRef.current = { W, H, S, dpr, isMobile: isMobileViewport };

    const canvas = canvasRef.current;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const N = isMobileViewport ? 22 : 30;
    const now = performance.now();

    // BUG 2: Compute portOrder (left-to-right port order to prevent cable crossing)
    let newPortOrder: number[];
    if (isMobileViewport) {
      newPortOrder = activeLinks.map((_, i) => i);
    } else {
      const hubEl = sectionRef.current?.querySelector<HTMLElement>("#cable-hub");
      let hubX = W * 0.5;
      if (hubEl) {
        const hRect = hubEl.getBoundingClientRect();
        hubX = hRect.left - stRect.left + hRect.width / 2;
      }
      const cardPositions = activeLinks.map((_, idx) => {
        const sockEl = sectionRef.current?.querySelector<HTMLElement>(`[data-sock-index="${idx}"]`);
        if (sockEl) {
          const sRect = sockEl.getBoundingClientRect();
          return {
            idx,
            x: sRect.left - stRect.left + sRect.width / 2,
            y: sRect.top - stRect.top + sRect.height / 2,
          };
        }
        return { idx, x: W * (idx === 0 ? 0.2 : 0.8), y: H * 0.5 };
      });

      const left = cardPositions
        .filter((c) => c.x < hubX)
        .sort((a, b) => a.y - b.y)
        .map((c) => c.idx);

      const right = cardPositions
        .filter((c) => c.x >= hubX)
        .sort((a, b) => b.y - a.y) // lowest first (highest y), highest last
        .map((c) => c.idx);

      newPortOrder = [...left, ...right];
    }

    setPortOrder((prev) => {
      if (prev.length === newPortOrder.length && prev.every((v, i) => v === newPortOrder[i])) {
        return prev;
      }
      return newPortOrder;
    });

    // Recompute or initialize cables
    const newCables: CableData[] = activeLinks.map((link, idx) => {
      // 1. Destination card socket measurement
      const sockEl = sectionRef.current?.querySelector<HTMLElement>(`[data-sock-index="${idx}"]`);
      let k = { x: W * 0.5, y: H * 0.85, w: 20, h: 20 };
      if (sockEl) {
        const sRect = sockEl.getBoundingClientRect();
        k = {
          x: sRect.left - stRect.left,
          y: sRect.top - stRect.top,
          w: sRect.width,
          h: sRect.height,
        };
      }

      // 2. Origin hub port jack measurement (real DOM element center in canvas space)
      const portJackEl =
        sectionRef.current?.querySelector<HTMLElement>(`[data-port-jack-index="${idx}"]`) ||
        sectionRef.current?.querySelector<HTMLElement>(`[data-port="${link.id}"] .hub-jack-socket`);
      let hub = { x: W * (0.42 + (idx - 1) * 0.08), y: isMobileViewport ? 130 : 160 };
      if (portJackEl) {
        const pRect = portJackEl.getBoundingClientRect();
        hub = {
          x: pRect.left - stRect.left + pRect.width / 2,
          y: pRect.top - stRect.top + pRect.height / 2,
        };
      }

      const end = { x: k.x + k.w / 2, y: k.y + k.h / 2 };

      // Card-end plug enter direction
      let dir = { x: 0, y: -1 };
      if (useSideLayout) {
        dir = idx === 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
      }

      // Hub-end outward direction: straight down for all breakpoints
      const hubDir = { x: 0, y: 1 };

      const PLUG_BACK = 52 * S;
      const initHubSeat = Math.atan2(-hubDir.y, -hubDir.x);
      const initCardSeat = Math.atan2(-dir.y, -dir.x);
      const attachHub = {
        x: hub.x - Math.cos(initHubSeat) * PLUG_BACK,
        y: hub.y - Math.sin(initHubSeat) * PLUG_BACK,
      };
      const attachCard = {
        x: end.x - Math.cos(initCardSeat) * PLUG_BACK,
        y: end.y - Math.sin(initCardSeat) * PLUG_BACK,
      };

      const d = Math.hypot(attachCard.x - attachHub.x, attachCard.y - attachHub.y);
      const slackFactor = isMobileViewport ? 1.10 : 1.12;
      const rest = Math.max(d, 60 * S) * slackFactor / (N - 1);

      const existing = cablesRef.current[idx];

      if (reinitializePoints || !existing || existing.pts.length !== N) {
        const pts: Point[] = [];
        for (let j = 0; j < N; j++) {
          const t = j / (N - 1);
          const px = attachHub.x + (attachCard.x - attachHub.x) * t;
          const py = attachHub.y + (attachCard.y - attachHub.y) * t;
          pts.push({ x: px, y: py, ox: px, oy: py });
        }
        return {
          link,
          i: idx,
          pts,
          glow: existing ? existing.glow : 0,
          act: existing ? existing.act : 0,
          plugged: reinitializePoints ? (reducedMotion ? true : false) : (existing ? existing.plugged : (reducedMotion ? true : false)),
          startAt: reinitializePoints ? (now + idx * 220) : (existing ? existing.startAt : (now + idx * 220)),
          hub,
          hubDir,
          end,
          dir,
          rest,
          hubWob: existing ? existing.hubWob : 0,
          cardWob: existing ? existing.cardWob : 0,
        };
      } else {
        // Height-only update: recompute hub, hubDir, end, dir, rest without resetting points
        existing.hub = hub;
        existing.hubDir = hubDir;
        existing.end = end;
        existing.dir = dir;
        existing.rest = rest;
        return existing;
      }
    });

    cablesRef.current = newCables;
    lastWidthRef.current = W;
    lastIsMobileRef.current = isMobileViewport;
  }, [activeLinks, reducedMotion]);

  useEffect(() => {
    requestAnimationFrame(() => updateLayout(false));
  }, [portOrder, updateLayout]);

  // Initialize and handle debounced resize
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!sectionRef.current) return;
        const currentW = sectionRef.current.getBoundingClientRect().width;
        const isMobileViewport = window.innerWidth < 768 && window.innerHeight > 500;
        const widthDiff = Math.abs(currentW - lastWidthRef.current);
        const breakpointFlipped = isMobileViewport !== lastIsMobileRef.current;

        // Reinitialize only if width changed by >2px or breakpoint flipped
        if (widthDiff > 2 || breakpointFlipped) {
          updateLayout(true);
        } else {
          // Height-only changes (mobile address bar): recompute anchors only
          updateLayout(false);
        }
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    // Initial layout
    updateLayout(true);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Idle Patrol: every ~2.2s pulse one cable and illuminate its hub LED
  useEffect(() => {
    if (reducedMotion) return;

    let patrolIdx = 0;
    const patrolInterval = setInterval(() => {
      if (!isVisibleRef.current || document.hidden) return;
      if (cablesRef.current.length === 0) return;

      const targetIdx = patrolIdx % cablesRef.current.length;
      const cable = cablesRef.current[targetIdx];
      if (cable) {
        cable.glow = 1.0;
        setPatrolIndex(targetIdx);
        setTimeout(() => {
          setPatrolIndex((curr) => (curr === targetIdx ? null : curr));
        }, 1200);
      }
      patrolIdx++;
    }, 2200);

    return () => clearInterval(patrolInterval);
  }, [reducedMotion]);

  // Pause rAF when out of view via IntersectionObserver and visibilitychange
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisibleRef.current = entry.isIntersecting && entry.intersectionRatio >= 0.05;
      },
      { threshold: [0, 0.05, 0.5] }
    );
    observer.observe(section);

    const handleVisibility = () => {
      if (document.hidden) isVisibleRef.current = false;
      else if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        isVisibleRef.current = rect.bottom > 0 && rect.top < window.innerHeight;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Main 60fps Physics & Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const endPos = (r: CableData, now: number) => {
      if (dragRef.current && dragRef.current.r === r && dragRef.current.idx === r.pts.length - 1) {
        return { x: mouseRef.current.mx, y: mouseRef.current.my, u: 1 };
      }
      const u = reducedMotion ? 1 : Math.min(1, Math.max(0, (now - r.startAt) / 1220));
      const standOff = (dimsRef.current.isMobile ? 24 : 34) * dimsRef.current.S;
      const preX = r.end.x + r.dir.x * standOff;
      const preY = r.end.y + r.dir.y * standOff;
      let x: number, y: number;

      if (u < 0.78) {
        // Stage 1: Ballistic throw
        const t1 = u / 0.78;
        const e1 = 1 - Math.pow(1 - t1, 3);
        const arcHeight = (dimsRef.current.isMobile ? 38 : 82) * dimsRef.current.S;
        x = r.hub.x + (preX - r.hub.x) * e1;
        y = r.hub.y + (preY - r.hub.y) * e1 - Math.sin(t1 * Math.PI) * arcHeight;
      } else if (u < 0.88) {
        // Stage 2: Magnetic alignment pause
        const t2 = (u - 0.78) / 0.1;
        const pull = Math.sin(t2 * Math.PI) * 5 * dimsRef.current.S;
        x = preX + r.dir.x * pull;
        y = preY + r.dir.y * pull;
      } else {
        // Stage 3: High-velocity mechanical snap
        const t3 = (u - 0.88) / 0.12;
        const e3 = t3 * t3 * (3 - 2 * t3);
        const overshoot = Math.sin(t3 * Math.PI) * -5 * dimsRef.current.S;
        x = preX + (r.end.x - preX) * e3 + r.dir.x * overshoot;
        y = preY + (r.end.y - preY) * e3 + r.dir.y * overshoot;
      }

      if (u >= 0.96 && !r.plugged) {
        r.plugged = true;
        setPluggedMap((prev) => ({ ...prev, [r.i]: true }));
        spawnSparks(r.end.x, r.end.y, r.link.color, dimsRef.current.isMobile ? 8 : 16, 1.15);
        joltCard(r.i, r.dir, 1.1);
        if (sfxEnabledRef.current) playSnapSound(r.i, true);
      }
      return { x, y, u };
    };

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      if (!isVisibleRef.current || document.hidden) return;

      const isSurging = now < surgeUntilRef.current;
      setIsSurging(isSurging);

      const anyActive = cablesRef.current.some((c) => c.act > 0 || c.glow > 0.05) || isSurging;
      setIsAnyActive(anyActive);

      const { W, H, S, dpr, isMobile } = dimsRef.current;
      const mouse = mouseRef.current;
      const iterations = isMobile ? 10 : 14;

      // 1. Step Physics
      cablesRef.current.forEach((r) => {
        const p = r.pts;
        const N = p.length;
        if (N < 2) return;

        const e = endPos(r, now);
        r.currentEnd = e;

        const PLUG_BACK = 52 * S;
        const hubSeat = Math.atan2(-r.hubDir.y, -r.hubDir.x);
        const cardSeat = Math.atan2(-r.dir.y, -r.dir.x);

        const θh = hubSeat + r.hubWob;

        // Card end angle:
        // During flight: natural tangent angle, blending into seated angle + wobble over 150ms snap
        let θc: number;
        const isCardPlugged = r.plugged && (!dragRef.current || dragRef.current.r !== r);
        if (isCardPlugged) {
          θc = cardSeat + r.cardWob;
        } else {
          const a0 = p[N - 3] || p[N - 2] || p[0];
          const naturalAng = Math.atan2(e.y - a0.y, e.x - a0.x);
          const blend = e.u >= 0.88 ? Math.min(1, Math.max(0, (e.u - 0.88) / 0.12)) : 0;
          const seatedAng = cardSeat + r.cardWob;
          θc = naturalAng + angleDiff(seatedAng, naturalAng) * blend;
        }

        // Anchor endpoints to the back ends of the plugs
        p[0].x = r.hub.x - Math.cos(θh) * PLUG_BACK;
        p[0].y = r.hub.y - Math.sin(θh) * PLUG_BACK;

        if (dragRef.current && dragRef.current.r === r && dragRef.current.idx === N - 1) {
          p[N - 1].x = mouse.mx;
          p[N - 1].y = mouse.my;
        } else {
          p[N - 1].x = e.x - Math.cos(θc) * PLUG_BACK;
          p[N - 1].y = e.y - Math.sin(θc) * PLUG_BACK;
        }

        for (let i = 1; i < N - 1; i++) {
          const q = p[i];
          if (dragRef.current && dragRef.current.r === r && dragRef.current.idx === i) {
            q.x = mouse.mx;
            q.y = mouse.my;
            q.ox = mouse.mx;
            q.oy = mouse.my;
            continue;
          }

          const vx = (q.x - q.ox) * 0.982;
          const vy = (q.y - q.oy) * 0.982;
          q.ox = q.x;
          q.oy = q.y;
          q.x += vx;
          q.y += vy + 0.36 * S;

          if (!reducedMotion) {
            q.x += Math.sin(now * 0.0016 + i * 0.32 + r.i) * 0.055 * S;
          }

          // Desktop cursor repulsion & plucking
          if (!dragRef.current && mouse.mx > -900) {
            const dx = q.x - mouse.mx;
            const dy = q.y - mouse.my;
            const d = Math.hypot(dx, dy);
            const RR = 68 * S;
            if (d < RR && d > 0) {
              const falloff = 1 - d / RR;
              const push = falloff * 3.6 * S;
              q.x += (dx / d) * push + mouse.mvx * falloff * 0.28;
              q.y += (dy / d) * push + mouse.mvy * falloff * 0.28;
            }
          }
        }

        // Strain relief near card plug (measured from new attach point p[N-1] along reversed plug axis)
        const alignWeight = Math.max(0.15, e.u);
        for (let k = 1; k <= 3; k++) {
          const q2 = p[N - 1 - k];
          if (dragRef.current && dragRef.current.r === r && dragRef.current.idx === N - 1 - k) continue;
          const targetX = p[N - 1].x - Math.cos(θc) * (k * r.rest * 1.0);
          const targetY = p[N - 1].y - Math.sin(θc) * (k * r.rest * 1.0);
          q2.x += (targetX - q2.x) * (0.36 * alignWeight);
          q2.y += (targetY - q2.y) * (0.36 * alignWeight);
        }

        // Strain relief near hub port (first 4 points measured from new attach point p[0] along reversed plug axis)
        for (let k = 1; k <= 4; k++) {
          const q1 = p[k];
          if (dragRef.current && dragRef.current.r === r && dragRef.current.idx === k) continue;
          const targetX = p[0].x - Math.cos(θh) * (k * r.rest * 1.0);
          const targetY = p[0].y - Math.sin(θh) * (k * r.rest * 1.0);
          q1.x += (targetX - q1.x) * 0.5;
          q1.y += (targetY - q1.y) * 0.5;
        }

        // Constraints
        for (let it = 0; it < iterations; it++) {
          for (let j = 0; j < N - 1; j++) {
            const a = p[j];
            const b = p[j + 1];
            const dx2 = b.x - a.x;
            const dy2 = b.y - a.y;
            const d2 = Math.hypot(dx2, dy2) || 1;
            const df = (d2 - r.rest) / d2;
            const fa = j === 0 || (dragRef.current && dragRef.current.r === r && dragRef.current.idx === j) ? 0 : 0.5;
            const fb = j === N - 2 || (dragRef.current && dragRef.current.r === r && dragRef.current.idx === j + 1) ? 0 : 0.5;
            const n = fa + fb;
            if (!n) continue;
            a.x += dx2 * df * (fa / n);
            a.y += dy2 * df * (fa / n);
            b.x -= dx2 * df * (fb / n);
            b.y -= dy2 * df * (fb / n);
          }
        }

        // Clamp every point so no cable leaves the section or goes under the hint row
        for (let j = 0; j < N; j++) {
          p[j].y = Math.min(p[j].y, H * 0.9);
        }

        // Plug follows the cable (clamped pivot around the tip)
        // Hub end: desired axis points toward the socket
        const hubDesiredAxis = Math.atan2(p[0].y - p[3].y, p[0].x - p[3].x);
        const hubTarget = clamp(angleDiff(hubDesiredAxis, hubSeat), -0.35, 0.35);
        r.hubWob += (hubTarget - r.hubWob) * 0.22;

        // Card end: desired axis points toward the socket (only after flight completes)
        if (r.plugged) {
          const cardDesiredAxis = Math.atan2(p[N - 1].y - p[N - 4].y, p[N - 1].x - p[N - 4].x);
          const cardTarget = clamp(angleDiff(cardDesiredAxis, cardSeat), -0.35, 0.35);
          r.cardWob += (cardTarget - r.cardWob) * 0.22;
        } else {
          r.cardWob = 0;
        }

        const targetGlow = r.act || isSurging || (dragRef.current && dragRef.current.r === r) ? 1 : 0;
        r.glow += (targetGlow - r.glow) * 0.14;
      });

      // Step particles
      const sparks = sparksRef.current;
      for (let s = sparks.length - 1; s >= 0; s--) {
        const sp = sparks[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.22 * S;
        sp.vx *= 0.96;
        sp.life -= sp.decay;
        if (sp.life <= 0) sparks.splice(s, 1);
      }

      const rings = ringsRef.current;
      for (let rg = rings.length - 1; rg >= 0; rg--) {
        const ring = rings[rg];
        ring.r += (ring.maxR - ring.r) * 0.16;
        ring.alpha *= 0.88;
        if (ring.alpha < 0.03) rings.splice(rg, 1);
      }

      mouse.mvx *= 0.8;
      mouse.mvy *= 0.8;

      // 2. Render Frame
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // 2b. Glossy Multi-Layer Cables
      const strokePath = (pts: Point[], width: number, strokeStyle: string, ox = 0, oy = 0, dash?: number[]) => {
        ctx.save();
        ctx.translate(ox, oy);
        if (dash) ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.lineWidth = width;
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
        ctx.restore();
      };

      cablesRef.current.forEach((r) => {
        const p = r.pts;
        const N = p.length;
        if (N < 2) return;
        const c = r.link.color;
        const w = Math.max(6, 12 * S);
        const g = r.glow;

        // Drop shadows (no shadow stroke wider than 1.5x the tube width)
        strokePath(p, w * 1.05, "rgba(0,0,0,0.30)", 2 * S, 4 * S);
        strokePath(p, w * 1.5, "rgba(0,0,0,0.08)", 2 * S, 5 * S);

        // Outer neon aura glow
        if (g > 0.02) {
          ctx.save();
          ctx.globalAlpha = g * 0.38;
          ctx.shadowColor = "#39FF14";
          ctx.shadowBlur = 18 * S;
          strokePath(p, w * 2.2, "#39FF14");
          ctx.restore();
        }

        // Base cable sheath + brand body
        strokePath(p, w, shadeColor(c, 0.32));
        strokePath(p, w * 0.82, c);

        // Braided studio cable texture weave
        strokePath(p, w * 0.72, "rgba(0,0,0,0.22)", 0, 0, [3.5 * S, 5.5 * S]);

        // Specular highlights
        strokePath(p, w * 0.28, "rgba(255,255,255,0.46)", -w * 0.16, -w * 0.2);
        strokePath(p, w * 0.1, "rgba(255,255,255,0.86)", -w * 0.2, -w * 0.26);

        // Precompute cumulative arc distances for telemetry beads
        const cumDist = [0];
        for (let i = 1; i < N; i++) {
          cumDist.push(cumDist[i - 1] + Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y));
        }
        const totalLen = cumDist[N - 1] || 1;

        // Ambient idle telemetry bead
        if (r.plugged && !reducedMotion) {
          const idleDist = ((now * 0.00022 + r.i * 0.33) % 1) * totalLen;
          const ip = pointAtArc(p, cumDist, idleDist, totalLen);
          ctx.save();
          ctx.globalAlpha = 0.55 * (1 - g * 0.5);
          ctx.fillStyle = "#39FF14";
          if (!isMobile) {
            ctx.shadowColor = "#39FF14";
            ctx.shadowBlur = 8 * S;
          }
          ctx.beginPath();
          ctx.arc(ip.x, ip.y, w * 0.22, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // High-speed multi-packet stream when active / hovered
        if (g > 0.02) {
          ctx.save();
          ctx.globalAlpha = g;
          strokePath(p, w * 0.25, "#39FF14");
          ctx.restore();

          for (let pk = 0; pk < 3; pk++) {
            const headDist = ((now * 0.00085 + pk / 3 + r.i * 0.17) % 1) * totalLen;
            for (let tail = 0; tail < 5; tail++) {
              const pt = pointAtArc(p, cumDist, headDist - tail * 6.5 * S, totalLen);
              const fall = 1 - tail / 5;
              ctx.save();
              ctx.globalAlpha = g * fall;
              if (!isMobile || g > 0.5) {
                ctx.shadowColor = "#39FF14";
                ctx.shadowBlur = (tail === 0 ? 16 : 8) * S;
              }
              ctx.fillStyle = tail === 0 ? "#ffffff" : "#39FF14";
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, w * (0.42 * fall), 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }
        }

        // 1. Hardware Connector Plug at Hub End: tip anchored at hub jack with rotation θh
        const hubSeat = Math.atan2(-r.hubDir.y, -r.hubDir.x);
        const hubPlugAng = hubSeat + r.hubWob;
        const PLUG_BACK = 52 * S;

        // Keep p[0] matched to boot back center
        p[0].x = r.hub.x - Math.cos(hubPlugAng) * PLUG_BACK;
        p[0].y = r.hub.y - Math.sin(hubPlugAng) * PLUG_BACK;

        drawPlug(
          ctx,
          r.hub.x,
          r.hub.y,
          hubPlugAng,
          c,
          true,
          g > 0.25 || isSurging,
          g,
          S,
          isMobile,
          true,
          w
        );

        // 2. Hardware Connector Plug at Card End: tip anchored at e with rotation θc
        const e = r.currentEnd || endPos(r, now);
        const cardSeat = Math.atan2(-r.dir.y, -r.dir.x);
        const isCardPlugged = r.plugged && (!dragRef.current || dragRef.current.r !== r);
        let cardPlugAng: number;
        if (isCardPlugged) {
          cardPlugAng = cardSeat + r.cardWob;
        } else {
          const a0 = p[N - 3] || p[N - 2] || p[0];
          const naturalAng = Math.atan2(e.y - a0.y, e.x - a0.x);
          const blend = e.u >= 0.88 ? Math.min(1, Math.max(0, (e.u - 0.88) / 0.12)) : 0;
          const seatedAng = cardSeat + r.cardWob;
          cardPlugAng = naturalAng + angleDiff(seatedAng, naturalAng) * blend;
        }

        if (!dragRef.current || dragRef.current.r !== r || dragRef.current.idx !== N - 1) {
          p[N - 1].x = e.x - Math.cos(cardPlugAng) * PLUG_BACK;
          p[N - 1].y = e.y - Math.sin(cardPlugAng) * PLUG_BACK;
        }

        drawPlug(
          ctx,
          e.x,
          e.y,
          cardPlugAng,
          c,
          isCardPlugged,
          g > 0.25 || (isCardPlugged && isSurging),
          g,
          S,
          isMobile,
          false,
          w
        );
      });

      // 2c. Render shockwave rings & electric sparks
      ringsRef.current.forEach((ring) => {
        ctx.save();
        ctx.globalAlpha = ring.alpha;
        ctx.strokeStyle = "#39FF14";
        ctx.lineWidth = 2 * S;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      sparksRef.current.forEach((sp) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sp.life);
        ctx.fillStyle = sp.c;
        if (!isMobile) {
          ctx.shadowColor = sp.c;
          ctx.shadowBlur = 8 * S;
        }
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r * sp.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [reducedMotion, joltCard, spawnSparks]);

  // Pointer Interaction Handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!sectionRef.current) return;
    const b = sectionRef.current.getBoundingClientRect();
    const nx = e.clientX - b.left;
    const ny = e.clientY - b.top;

    if (mouseRef.current.pmx > -900) {
      mouseRef.current.mvx = nx - mouseRef.current.pmx;
      mouseRef.current.mvy = ny - mouseRef.current.pmy;
    }
    mouseRef.current.mx = mouseRef.current.pmx = nx;
    mouseRef.current.my = mouseRef.current.pmy = ny;

    // Desktop parallax: disable on touch or reduced-motion
    if (!reducedMotion && e.pointerType === "mouse") {
      sectionRef.current.style.setProperty("--mx", (((nx / b.width) - 0.5) * 2).toFixed(3));
      sectionRef.current.style.setProperty("--my", (((ny / b.height) - 0.5) * 2).toFixed(3));
    }
  };

  const handlePointerLeave = () => {
    mouseRef.current.mx = mouseRef.current.pmx = mouseRef.current.my = mouseRef.current.pmy = -999;
    mouseRef.current.mvx = mouseRef.current.mvy = 0;
    dragRef.current = null;
    if (sectionRef.current) {
      sectionRef.current.style.setProperty("--mx", "0");
      sectionRef.current.style.setProperty("--my", "0");
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!sectionRef.current) return;
    const b = sectionRef.current.getBoundingClientRect();
    const cx = e.clientX - b.left;
    const cy = e.clientY - b.top;
    mouseRef.current.mx = mouseRef.current.pmx = cx;
    mouseRef.current.my = mouseRef.current.pmy = cy;

    const { S } = dimsRef.current;
    let best: { r: CableData; idx: number } | null = null;
    let bestDist = (e.pointerType === "touch" ? 28 : 42) * S;

    cablesRef.current.forEach((r) => {
      r.pts.forEach((pt, idx) => {
        if (idx === 0) return;
        const d = Math.hypot(pt.x - cx, pt.y - cy);
        if (d < bestDist) {
          bestDist = d;
          best = { r, idx };
        }
      });
    });

    if (best) {
      const match = best as { r: CableData; idx: number };
      if (e.pointerType === "mouse") {
        // Desktop drag-to-pluck
        dragRef.current = match;
        if (match.idx >= match.r.pts.length - 3) {
          match.idx = match.r.pts.length - 1;
          match.r.plugged = false;
          setPluggedMap((prev) => ({ ...prev, [match.r.i]: false }));
        }
        if (sfxEnabledRef.current) playPluckSound(match.r.i, true);
        spawnSparks(cx, cy, match.r.link.color, 6, 0.65);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Ignore capture error
        }
      } else {
        // Touch pluck: single impulse, NO pointer capture, NO scroll blocking
        const pt = match.r.pts[match.idx];
        pt.ox = pt.x - (cx - pt.x) * 0.45;
        pt.oy = pt.y - (cy - pt.y) * 0.45;
        match.r.glow = 1.0;
        if (sfxEnabledRef.current) playPluckSound(match.r.i, true);
        spawnSparks(cx, cy, match.r.link.color, 5, 0.5);
      }
    }
  };

  const handlePointerUp = () => {
    if (dragRef.current) {
      const dr = dragRef.current.r;
      if (dragRef.current.idx === dr.pts.length - 1) {
        // Snap back into socket from released position
        dr.startAt = performance.now() - 980;
      } else {
        if (sfxEnabledRef.current) playPluckSound(dr.i, true);
      }
      dragRef.current = null;
    }
  };

  // Card interaction callbacks
  const handleCardEnter = (idx: number) => {
    setActiveCardIndex(idx);
    const cable = cablesRef.current[idx];
    if (cable) {
      cable.act = 1;
      cable.glow = 1;
      if (cable.plugged) {
        spawnSparks(cable.end.x, cable.end.y, cable.link.color, 8, 0.7);
      }
    }
    if (sfxEnabledRef.current) playHoverSound(idx, true);
  };

  const handleCardLeave = (idx: number) => {
    setActiveCardIndex(null);
    const cable = cablesRef.current[idx];
    if (cable) {
      cable.act = 0;
    }
    if (sectionRef.current) {
      const cardEl = sectionRef.current.querySelector<HTMLElement>(`[data-link-index="${idx}"]`);
      if (cardEl) {
        cardEl.style.setProperty("--rx", "0deg");
        cardEl.style.setProperty("--ry", "0deg");
      }
    }
  };

  const handleCardPointerDown = (idx: number, e: React.PointerEvent) => {
    // Immediately illuminate cable and hub port, trigger sparks and audio
    setActiveCardIndex(idx);
    const cable = cablesRef.current[idx];
    if (cable) {
      cable.glow = 1;
      spawnSparks(cable.end.x, cable.end.y, cable.link.color, 10, 0.85);
    }
    if (sfxEnabledRef.current) playSnapSound(idx, true);
    if (e.pointerType === "touch") {
      setTimeout(() => {
        setActiveCardIndex((prev) => (prev === idx ? null : prev));
      }, 900);
    }
  };

  // Toolbar Actions (Desktop)
  const handleReplug = () => {
    setPluggedMap({});
    updateLayout(true);
  };

  const handleSurge = () => {
    const now = performance.now();
    surgeUntilRef.current = now + 1600;
    setIsSurging(true);
    cablesRef.current.forEach((r, idx) => {
      setTimeout(() => {
        if (sfxEnabledRef.current) playHoverSound(idx, true);
        if (r.plugged) {
          spawnSparks(r.end.x, r.end.y, r.link.color, 18, 1.25);
          joltCard(idx, r.dir, 1.2);
        }
      }, idx * 110);
    });
    setTimeout(() => setIsSurging(false), 1650);
  };

  const toggleSound = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    if (next) {
      getAudioContext(true);
      playHoverSound(0, true);
    }
  };

  const pluggedCount = activeLinks.filter((_, idx) => pluggedMap[idx]).length;

  return (
    <section
      id="links"
      ref={sectionRef}
      className={`links-section relative flex flex-col items-center justify-between overflow-hidden select-none ${
        isAnyActive ? "any-active" : ""
      } ${isSurging ? "surging" : ""}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
    >
      {/* Scoped responsive overrides for landscape phones (max-height: 500px) */}
      <style>{`
        @media (max-height: 500px) and (orientation: landscape) {
          #links.links-section {
            min-height: 480px !important;
            height: auto !important;
            padding-top: 12px !important;
            padding-bottom: 24px !important;
          }
          #links .links-headline {
            font-size: clamp(2rem, 5vw, 2.75rem) !important;
            margin-top: 2px !important;
          }
          #links .link-cards-nav {
            position: static !important;
          }
          #links .link-card {
            min-height: 60px !important;
            width: clamp(200px, 25vw, 240px) !important;
            padding: 0 12px !important;
          }
          #links .link-card[data-link-index="0"] {
            left: 2% !important;
            top: 30% !important;
          }
          #links .link-card[data-link-index="1"] {
            right: 2% !important;
            top: 26% !important;
          }
          #links .link-card[data-link-index="2"] {
            right: 2% !important;
            top: 58% !important;
          }
          #links .links-toolbar {
            display: none !important;
          }
        }
      `}</style>

      {/* 1. Subtle CRT Scanline overlay (Desktop only, hidden on mobile for performance) */}
      <div className="crt-scanlines hidden md:block" aria-hidden="true" />

      {/* 2. Radial Ambient Background Glow */}
      <div className="links-glow" aria-hidden="true" />

      {/* 3. Perspective Floor Grid (Transform-optimized, hidden on mobile) */}
      <div className="links-floor hidden md:block" aria-hidden="true" />

      {/* 4. Top Header & Hardware CableHub group (placed strictly above canvas) */}
      <div className="links-header-group relative z-20 flex flex-col items-center w-full max-w-3xl px-4 pointer-events-none">
        {/* Eyebrow */}
        <div className="links-eyebrow pointer-events-auto" aria-hidden="true">
          <span className="blinking-dot" />
          <span>shwetdaily / links</span>
        </div>

        {/* Headline: "FIND THE BUILD" */}
        <h2 className="links-headline pointer-events-auto">
          Find the <span className="o">build</span>
        </h2>

        {/* Hardware Patch Hub Device */}
        <div className="pointer-events-auto w-full flex justify-center">
          <CableHub
            links={activeLinks}
            order={portOrder}
            activePortIndex={activeCardIndex !== null ? activeCardIndex : patrolIndex}
            isSurging={isSurging}
            onPortPointerEnter={handleCardEnter}
            onPortPointerLeave={handleCardLeave}
            onPortClick={handleCardPointerDown}
          />
        </div>
      </div>

      {/* 5. High-Performance HTML5 Canvas for Glossy Cables & Physics */}
      <canvas
        id="link-cables-canvas"
        ref={canvasRef}
        aria-hidden="true"
        onPointerDown={handleCanvasPointerDown}
      />

      {/* 6. Progressive Enhancement: Accessible Social Cards */}
      <LinkCards
        links={activeLinks}
        activeCardIndex={activeCardIndex}
        pluggedMap={pluggedMap}
        onCardPointerEnter={handleCardEnter}
        onCardPointerLeave={handleCardLeave}
        onCardFocus={handleCardEnter}
        onCardBlur={handleCardLeave}
        onCardPointerDown={handleCardPointerDown}
      />

      {/* 7. Bottom Controls & Status Area (Static position, z-20 above canvas, centered below cable trajectory) */}
      <div className="relative z-20 flex flex-col items-center gap-2.5 mt-auto pt-4 pb-2 w-full max-w-xl pointer-events-auto">
        {/* "3/3 PATCHED" Status Badge Pill (Centered above toolbar) */}
        <div className="flex items-center justify-center">
          <span className="status-badge" aria-live="polite">
            {pluggedCount}/{activeLinks.length} PATCHED
          </span>
        </div>

        {/* Toolbar Controls (Desktop only, sound defaults to OFF) */}
        <div className="links-toolbar hidden md:flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReplug}
            className="links-toolbar-btn"
            aria-label="Re-plug all cables"
          >
            &#8635; Re-plug
          </button>
          <button
            type="button"
            onClick={handleSurge}
            className="links-toolbar-btn"
            aria-label="Trigger power surge"
          >
            &#9889; Power Surge
          </button>
          <button
            type="button"
            onClick={toggleSound}
            className="links-toolbar-btn"
            aria-pressed={sfxEnabled}
            aria-label={`Toggle sound effects (${sfxEnabled ? "On" : "Off"})`}
          >
            &#9835; Sound: {sfxEnabled ? "On" : "Off"}
          </button>
        </div>

        {/* Subtle Hint Text */}
        <div className="text-[11px] font-mono tracking-wider text-[#8a968e] uppercase text-center pointer-events-none mt-0.5">
          <span className="hidden md:inline">
            hover a card to power it, drag a cable to pluck it
          </span>
          <span className="inline md:hidden">
            tap a plug to open it
          </span>
        </div>
      </div>
    </section>
  );
};
