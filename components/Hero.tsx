"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { siteConfig } from "@/data/site";
import { ChevronDown } from "lucide-react";

export const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Desktop mouse parallax state (clamped to max 12px)
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (shouldReduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Parallax only on desktop devices
      if (window.innerWidth < 768) return;
      const { innerWidth, innerHeight } = window;
      const x = ((e.clientX / innerWidth) - 0.5) * 24; // -12px to +12px
      const y = ((e.clientY / innerHeight) - 0.5) * 24; // -12px to +12px
      setMouseOffset({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [shouldReduceMotion]);

  // Mobile & scroll parallax
  const { scrollY } = useScroll();
  const avatarScrollY = useTransform(scrollY, [0, 500], [0, shouldReduceMotion ? 0 : 50]);
  const textScrollY = useTransform(scrollY, [0, 500], [0, shouldReduceMotion ? 0 : -30]);

  return (
    <section
      ref={containerRef}
      className="relative flex h-[calc(100svh-4rem)] min-h-[620px] max-h-[1050px] w-full flex-col items-center justify-end overflow-hidden px-4 select-none"
    >
      {/* 1. Neon Radial Glow behind avatar (~12% opacity) */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div className="h-[450px] w-[450px] sm:h-[650px] sm:w-[650px] lg:h-[800px] lg:w-[800px] rounded-full bg-[radial-gradient(circle,rgba(57,255,20,0.13)_0%,rgba(57,255,20,0.05)_40%,transparent_70%)] blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[280px] w-[280px] sm:h-[400px] sm:w-[400px] rounded-full bg-[radial-gradient(circle,rgba(57,255,20,0.18)_0%,transparent_60%)] blur-2xl" />
      </div>

      {/* Semantic H1 for SEO & Accessibility */}
      <h1 className="sr-only">BUILD IN PUBLIC</h1>

      {/* 2a. Solid Line: "BUILD" (Layered BEHIND Avatar at z-10, shifted up to avatar head/neck) */}
      <motion.div
        style={{ y: textScrollY }}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[18%] sm:top-[16%] lg:top-[15%] z-10 flex flex-col items-center justify-center text-center w-full px-2"
      >
        <div className="overflow-hidden py-1 sm:py-2.5">
          <motion.span
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="block t-hero text-[#F5F2E8] glow-build select-none"
          >
            BUILD
          </motion.span>
        </div>
      </motion.div>

      {/* 2b. Outlined Line: "IN PUBLIC" (Layered ABOVE Avatar at z-25, transparent fill so jeans/CRT show through) */}
      <motion.div
        style={{ y: textScrollY }}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[38%] sm:top-[36%] lg:top-[35%] z-25 flex flex-col items-center justify-center text-center w-full px-2"
      >
        <div className="overflow-hidden py-1 sm:py-2.5">
          <motion.span
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="block t-hero-sub stroke-headline select-none"
          >
            IN PUBLIC
          </motion.span>
        </div>
      </motion.div>

      {/* 3. Small Neon Green Floating Pills (z-30 above headline & avatar, spring animated) */}
      {/* Pill: TECH - Overlapping top-left of BUILD */}
      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: -3 }}
        animate={{
          scale: 1,
          opacity: 1,
          rotate: -3,
          y: shouldReduceMotion ? 0 : [0, -5, 0],
        }}
        transition={{
          scale: { type: "spring", stiffness: 260, damping: 20, delay: 0.4 },
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute z-30 top-[20%] sm:top-[18%] lg:top-[17%] left-[10%] sm:left-[18%] lg:left-[24%]"
      >
        <span className="inline-block rounded-md bg-[#39FF14] px-2.5 sm:px-3 py-1 t-label text-[#0A0A0A] shadow-[0_0_15px_rgba(57,255,20,0.5)]">
          TECH
        </span>
      </motion.div>

      {/* Pill: IDEAS - Overlapping top-right of BUILD */}
      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: 2 }}
        animate={{
          scale: 1,
          opacity: 1,
          rotate: 2,
          y: shouldReduceMotion ? 0 : [0, 6, 0],
        }}
        transition={{
          scale: { type: "spring", stiffness: 260, damping: 20, delay: 0.5 },
          y: { duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
        }}
        className="absolute z-30 top-[24%] sm:top-[22%] lg:top-[21%] right-[10%] sm:right-[18%] lg:right-[24%]"
      >
        <span className="inline-block rounded-md bg-[#39FF14] px-2.5 sm:px-3 py-1 t-label text-[#0A0A0A] shadow-[0_0_15px_rgba(57,255,20,0.5)]">
          IDEAS
        </span>
      </motion.div>

      {/* Pill: LIFE - Overlapping left side of IN PUBLIC */}
      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: -2 }}
        animate={{
          scale: 1,
          opacity: 1,
          rotate: -2,
          y: shouldReduceMotion ? 0 : [0, -4, 0],
        }}
        transition={{
          scale: { type: "spring", stiffness: 260, damping: 20, delay: 0.6 },
          y: { duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.8 },
        }}
        className="absolute z-30 top-[44%] sm:top-[42%] lg:top-[40%] left-[8%] sm:left-[16%] lg:left-[22%]"
      >
        <span className="inline-block rounded-md bg-[#39FF14] px-2.5 sm:px-3 py-1 t-label text-[#0A0A0A] shadow-[0_0_15px_rgba(57,255,20,0.5)]">
          LIFE
        </span>
      </motion.div>

      {/* 4. Handwritten Note in Caveat with Curved SVG Arrow (No glow) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.7 }}
        className="absolute z-30 top-[12%] sm:top-[14%] lg:top-[15%] right-[4%] sm:right-[8%] lg:right-[12%] flex flex-col items-center pointer-events-none"
      >
        <div className="rotate-[-4deg] sm:rotate-[-6deg] text-center">
          <span className="font-caveat text-xl sm:text-2xl lg:text-3xl font-semibold text-[#F5F2E8]">
            come figure it out with me
          </span>
        </div>
        {/* Curved Hand-Drawn SVG Arrow pointing towards avatar */}
        <svg
          className="w-10 h-8 sm:w-14 sm:h-12 mt-0.5 text-[#39FF14] -rotate-6"
          viewBox="0 0 70 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 55 5 C 42 12, 28 20, 20 38 C 17 44, 15 48, 14 52"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 8 44 C 11 48, 14 52, 14 52 C 16 48, 22 45, 26 44"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>

      {/* 5. Floor Glow / Ellipse Shadow under the CRT Monitor */}
      <div
        className="pointer-events-none absolute bottom-12 sm:bottom-14 left-1/2 -translate-x-1/2 z-15"
        aria-hidden="true"
      >
        <div className="h-10 w-[280px] sm:h-14 sm:w-[480px] lg:w-[600px] rounded-[100%] bg-[radial-gradient(ellipse,rgba(57,255,20,0.35)_0%,rgba(57,255,20,0.1)_45%,transparent_75%)] blur-md" />
        <div className="h-6 w-[200px] sm:h-8 sm:w-[320px] mx-auto rounded-[100%] bg-[radial-gradient(ellipse,rgba(0,0,0,0.9)_0%,transparent_75%)] blur-sm" />
      </div>

      {/* 6. Avatar Centered at Bottom (z-20 overlapping headline) */}
      <motion.div
        style={{
          y: avatarScrollY,
          x: mouseOffset.x,
        }}
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
        className="relative z-20 flex justify-center items-end will-change-transform max-w-full pb-10 sm:pb-12"
      >
        <div className="relative h-[60vh] sm:h-[70vh] lg:h-[75vh] w-auto aspect-[4/5] max-h-[820px] pointer-events-none">
          <Image
            src="/avatar.webp"
            alt={siteConfig.avatarAlt}
            priority
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 70vw, 60vw"
            className="object-contain object-bottom drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)]"
          />
        </div>
      </motion.div>

      {/* 7. Tiny "Scroll" indicator at bottom */}
      <motion.a
        href="#topics"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-3 z-30 flex items-center gap-1.5 rounded-full bg-[#0A0A0A]/85 px-3 py-1 border border-white/10 backdrop-blur-md t-label text-[#F5F2E8]/70 hover:text-[#39FF14] hover:border-[#39FF14]/50 transition-all shadow-lg"
        aria-label="Scroll down to topics"
      >
        <span>SCROLL</span>
        <motion.div
          animate={{ y: [0, 2, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-3 w-3 text-[#39FF14]" />
        </motion.div>
      </motion.a>
    </section>
  );
};
