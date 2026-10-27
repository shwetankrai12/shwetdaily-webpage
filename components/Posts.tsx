"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { posts } from "@/data/posts";
import { siteConfig } from "@/data/site";
import { ArrowLeft, ArrowRight, ArrowUpRight, Play } from "lucide-react";
import { InstagramIcon } from "./Button";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const GithubIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export const Posts = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [filterWithCode, setFilterWithCode] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const offset = direction === "left" ? -340 : 340;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  // Check if ANY post has a non-empty github link
  const hasCodePosts = posts.some((p) => Boolean(p.github && p.github.trim() !== ""));

  // Filtered posts based on chip toggle
  const displayedPosts = filterWithCode
    ? posts.filter((p) => Boolean(p.github && p.github.trim() !== ""))
    : posts;

  return (
    <section id="posts" className="relative w-full py-24 sm:py-32 border-t border-white/5 bg-[#0A0A0A] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-[#39FF14]" />
              <span className="t-label text-[#39FF14]">
                FEED & REELS
              </span>
            </div>
            <h2 className="t-h2 text-[#F5F2E8]">
              LATEST POSTS
            </h2>
          </div>

          {/* Controls: Filter Chip + Carousel Arrows */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Chip (hidden if no posts have github links) */}
            {hasCodePosts && (
              <button
                type="button"
                onClick={() => setFilterWithCode(!filterWithCode)}
                aria-pressed={filterWithCode}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-full t-label text-xs inline-flex items-center gap-2 border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39FF14] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] cursor-pointer ${
                  filterWithCode
                    ? "border-[#39FF14] bg-[#39FF14]/15 text-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.2)]"
                    : "border-white/10 bg-[#111111] text-[#F5F2E8]/70 hover:border-white/25 hover:text-[#F5F2E8]"
                }`}
              >
                <span className="font-mono text-[11px] text-[#39FF14]">&lt;/&gt;</span>
                <span>With code</span>
                {filterWithCode && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#39FF14] animate-pulse" />
                )}
              </button>
            )}

            <span className="t-label text-[#F5F2E8]/70 hidden md:inline-block mr-1">
              SWIPE / SCROLL
            </span>
            <button
              type="button"
              onClick={() => scroll("left")}
              className="p-3 rounded-full border border-white/10 bg-[#111111] text-[#F5F2E8] hover:border-[#39FF14] hover:text-[#39FF14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39FF14] transition-all cursor-pointer"
              aria-label="Previous posts"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              className="p-3 rounded-full border border-white/10 bg-[#111111] text-[#F5F2E8] hover:border-[#39FF14] hover:text-[#39FF14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39FF14] transition-all cursor-pointer"
              aria-label="Next posts"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll-Snap Container */}
      <div
        ref={scrollContainerRef}
        className="posts-scroller flex gap-6 overflow-x-auto pb-8 pt-2 snap-x snap-mandatory no-scrollbar scroll-smooth"
      >
        <AnimatePresence mode="popLayout">
          {displayedPosts.map((post, idx) => {
            const hasGithub = Boolean(post.github && post.github.trim() !== "");

            return (
              <motion.div
                key={post.title + idx}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.3,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group relative flex-shrink-0 w-[280px] sm:w-[310px] h-[330px] sm:h-[350px] snap-start rounded-2xl bg-[#121212] border border-white/10 p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 hover:border-[#39FF14] hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(57,255,20,0.12)] overflow-hidden"
              >
                {/* Background texture or optional image */}
                {post.image ? (
                  <div className="absolute inset-0">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity bg-[radial-gradient(#F5F2E8_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[#39FF14]/5 blur-2xl group-hover:bg-[#39FF14]/15 transition-all" />
                  </>
                )}

                {/* Top row: Tags + Open Source badge + IG icon */}
                <div className="relative z-10 flex items-center justify-between gap-2 flex-shrink-0">
                  <div className="flex items-center gap-[6px] flex-nowrap overflow-hidden min-w-0">
                    <span className="t-label px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[#39FF14] whitespace-nowrap flex-shrink-0">
                      {post.tag || "Instagram"}
                    </span>
                    {hasGithub && (
                      <span className="font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded border border-[#39FF14]/40 bg-transparent text-[#39FF14] whitespace-nowrap flex-shrink-0">
                        OPEN SOURCE
                      </span>
                    )}
                  </div>
                  <div className="h-7 w-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#F5F2E8]/70 group-hover:text-[#39FF14] group-hover:border-[#39FF14]/30 transition-colors flex-shrink-0">
                    <InstagramIcon className="h-3.5 w-3.5" />
                  </div>
                </div>

                {/* Center / Body: Title & Reel subline (if date is present) */}
                <div className="relative z-10 flex-1 pt-5 pb-3 flex flex-col justify-start">
                  {Boolean(post.date && post.date.trim() !== "") && (
                    <div className="inline-flex items-center gap-1.5 t-label text-[#F5F2E8]/70 mb-2">
                      <Play className="h-3 w-3 text-[#39FF14] fill-[#39FF14]" />
                      <span>{post.date}</span>
                    </div>
                  )}
                  <h3 className="t-h3 text-[#F5F2E8] group-hover:text-[#39FF14] transition-colors line-clamp-4 leading-snug">
                    {post.title}
                  </h3>
                </div>

                {/* Bottom link row: Left VIEW ON IG, Right CODE (if github) */}
                <div className="relative z-10 pt-3 mt-auto border-t border-white/10 flex items-center justify-between gap-2 flex-shrink-0">
                  {/* Left: View on Instagram */}
                  <a
                    href={post.url || siteConfig.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View post on Instagram: ${post.title}`}
                    className="group/ig min-h-[44px] inline-flex items-center gap-1.5 t-label text-[11px] sm:text-xs text-[#F5F2E8]/70 hover:text-[#39FF14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39FF14] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] rounded px-1 -mx-1 transition-colors"
                  >
                    <span>VIEW ON IG</span>
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/ig:translate-x-0.5 group-hover/ig:-translate-y-0.5 text-[#39FF14]" />
                  </a>

                  {/* Right: CODE ↗ with Github Icon (renders ONLY if post.github is non-empty) */}
                  {hasGithub && (
                    <a
                      href={post.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View source code on GitHub: ${post.title}`}
                      className="group/code min-h-[44px] inline-flex items-center gap-1.5 t-label text-[11px] sm:text-xs text-[#F5F2E8]/70 hover:text-[#39FF14] border border-transparent hover:border-[#39FF14] px-2.5 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39FF14] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] transition-all duration-200"
                    >
                      <GithubIcon className="w-3.5 h-3.5 text-[#F5F2E8]/70 group-hover/code:text-[#39FF14] transition-colors" />
                      <span>CODE</span>
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/code:translate-x-0.5 group-hover/code:-translate-y-0.5 text-[#39FF14]" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
};
