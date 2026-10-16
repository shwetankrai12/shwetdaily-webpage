"use client";

import React from "react";
import { siteConfig } from "@/data/site";
import { motion, useReducedMotion } from "framer-motion";
import { Cpu, TrendingUp, Sparkles, Globe, ArrowUpRight } from "lucide-react";

const topicIcons = [Cpu, TrendingUp, Sparkles, Globe];

export const Topics = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="topics" className="relative w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-[#0A0A0A]">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-[radial-gradient(circle,rgba(57,255,20,0.06)_0%,transparent_70%)] blur-3xl" />

      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mb-12 sm:mb-16">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-[#39FF14]" />
            <span className="t-label text-[#39FF14]">
              CORE DOMAINS
            </span>
          </div>
          <h2 className="t-h2 text-[#F5F2E8]">
            WHAT I BUILD & EXPLORE
          </h2>
        </div>

        {/* 2x2 Desktop Grid, 1 Column Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {siteConfig.topics.map((topic, index) => {
            const Icon = topicIcons[index % topicIcons.length];
            return (
              <motion.div
                key={topic.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.5,
                  delay: shouldReduceMotion ? 0 : index * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group relative flex flex-col justify-between rounded-2xl bg-[#111111] p-6 sm:p-8 lg:p-10 border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-[#39FF14] hover:shadow-[0_12px_36px_rgba(57,255,20,0.12)] cursor-default overflow-hidden"
              >
                {/* Subtle retro top-right accent */}
                <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none group-hover:from-[#39FF14]/15 transition-all" />

                <div>
                  <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <span className="t-stat text-[#39FF14]/50 group-hover:text-[#39FF14] transition-colors duration-300">
                      {topic.number}
                    </span>
                    <div className="flex items-center gap-2">
                      {topic.badge && (
                        <span className="t-label px-3 py-1 rounded-full bg-white/5 text-[#F5F2E8]/80 border border-white/10 group-hover:border-[#39FF14]/40 group-hover:text-[#39FF14] transition-colors">
                          {topic.badge}
                        </span>
                      )}
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#F5F2E8]/70 group-hover:text-[#39FF14] group-hover:border-[#39FF14]/40 group-hover:bg-[#39FF14]/10 transition-all">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <h3 className="t-h3 text-[#F5F2E8] group-hover:text-[#39FF14] transition-colors duration-200 mb-3">
                    {topic.title}
                  </h3>

                  <p className="t-body text-[#F5F2E8]/75">
                    {topic.description}
                  </p>
                </div>

                {/* Footer hint */}
                <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-end text-[#F5F2E8]/70 group-hover:text-[#39FF14] transition-colors">
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
