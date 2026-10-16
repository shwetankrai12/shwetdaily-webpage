"use client";

import React from "react";
import { siteConfig } from "@/data/site";
import { ArrowUp } from "lucide-react";

export const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const year = 2026;

  return (
    <footer className="w-full border-t border-white/5 bg-[#080808] py-8 px-4 sm:px-6 lg:px-8 t-label tracking-normal text-[#F5F2E8]/75">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Copyright */}
        <div className="flex items-center gap-2">
          <span>&copy; {year} {siteConfig.name}.</span>
          <span className="hidden sm:inline text-white/20">|</span>
          <span className="hidden sm:inline text-[#F5F2E8]/70">Built with Next.js &amp; Tailwind</span>
        </div>

        {/* Center handle */}
        <a
          href={siteConfig.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[#F5F2E8] hover:text-[#39FF14] transition-colors"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#39FF14]" />
          <span className="font-semibold">{siteConfig.handle}</span>
        </a>

        {/* Back-to-top */}
        <button
          type="button"
          onClick={scrollToTop}
          className="group flex items-center gap-1.5 t-label text-[#F5F2E8]/75 hover:text-[#39FF14] transition-colors"
          aria-label="Back to top"
        >
          <span>BACK TO TOP</span>
          <ArrowUp className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 text-[#39FF14]" />
        </button>
      </div>
    </footer>
  );
};
