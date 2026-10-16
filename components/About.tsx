"use client";

import React from "react";
import { siteConfig } from "@/data/site";
import { motion, useReducedMotion } from "framer-motion";
import { Terminal } from "lucide-react";

export const About = () => {
  const shouldReduceMotion = useReducedMotion();
  const { about, stats } = siteConfig;

  return (
    <section id="about" className="relative w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-[#0A0A0A]">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Left Column: Heading & Retro Terminal Box */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-[#39FF14] animate-pulse" />
                <span className="t-label text-[#39FF14]">
                  {about.eyebrow}
                </span>
              </div>
              <h2 className="t-h2 text-[#F5F2E8] mb-6">
                {about.heading}
              </h2>
            </div>

            {/* Retro Terminal Status Box */}
            <div className="mt-4 rounded-xl bg-[#121212] border border-white/10 p-5 space-y-2">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 t-label text-[#F5F2E8]/70">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-[#39FF14]" />
                  <span>shwetank.config.json</span>
                </div>
                <span className="text-[#39FF14] text-[11px] bg-[#39FF14]/10 px-2 py-0.5 rounded border border-[#39FF14]/30">
                  ONLINE
                </span>
              </div>
              <div className="pt-1 space-y-1.5 font-mono text-xs sm:text-[13px] text-[#F5F2E8]/85">
                {about.terminal.map((item) => (
                  <p key={item.key}>
                    <span className="text-[#39FF14]">&gt;</span> {item.key}:{" "}
                    <span className="text-[#F5F2E8]">&quot;{item.value}&quot;</span>
                  </p>
                ))}
                {Boolean(about.now && about.now.trim() !== "") && (
                  <p>
                    <span className="text-[#39FF14]">&gt;</span> building_now:{" "}
                    <span className="text-[#39FF14]">&quot;{about.now}&quot;</span>
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Bio Narrative & Pull Quote */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-between gap-8"
          >
            {/* Paragraphs from data/site.ts */}
            <div className="space-y-5 text-[#F5F2E8]/90 max-w-[62ch]">
              {about.paragraphs.map((para, idx) => (
                <p key={idx} className="t-lead">
                  {para}
                </p>
              ))}

              {about.pull && (
                <p className="font-caveat text-2xl sm:text-3xl text-[#39FF14] pt-2">
                  {about.pull}
                </p>
              )}
            </div>

            {/* Optional Stat Chips (only renders if stats are provided) */}
            {stats && stats.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl bg-[#121212] border border-white/10 p-5 hover:border-[#39FF14]/50 transition-colors"
                  >
                    <span className="t-stat text-[#39FF14] block mb-1">
                      {stat.value}
                    </span>
                    <p className="font-inter font-semibold text-sm sm:text-base text-[#F5F2E8]">
                      {stat.label}
                    </p>
                    {stat.caption && (
                      <p className="t-label tracking-normal text-[#F5F2E8]/70 mt-1">
                        {stat.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
