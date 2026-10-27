"use client";

import React, { useState } from "react";
import { siteConfig } from "@/data/site";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, InstagramIcon } from "@/components/Button";

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* 1. Logo: Inter 800, lowercase, tracking -0.045em, leading 1, 20px mobile / 24px desktop, two-tone, 8px pulsing dot */}
        <a
          href="#top"
          className="group flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39FF14] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] transition-opacity hover:opacity-95"
          aria-label="shwetdaily - Scroll to top"
        >
          {/* Small neon-green 8px dot pulsing slowly (disabled under prefers-reduced-motion) */}
          <span
            className="h-2 w-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14] group-hover:shadow-[0_0_14px_#39FF14] motion-safe:animate-pulse transition-all duration-300"
            aria-hidden="true"
          />
          {/* Two-tone logo: "shwet" in #F5F2E8 and "daily" in #39FF14 */}
          <span className="font-inter font-extrabold text-[20px] md:text-[24px] tracking-[-0.045em] leading-none select-none transition-colors">
            <span className="text-[#F5F2E8]">shwet</span>
            <span className="text-[#39FF14]">daily</span>
          </span>
        </a>

        {/* 2. Desktop Nav Links: Inter 500, 14px, text #F5F2E8/80, hover green, normal letter-spacing, not uppercase */}
        <nav className="hidden md:flex items-center gap-8">
          {siteConfig.navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-inter font-medium text-[14px] text-[#F5F2E8]/80 hover:text-[#39FF14] tracking-normal transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* 3. Desktop Actions: Reusable primary Button */}
        <div className="hidden sm:flex items-center gap-4">
          <Button
            variant="primary"
            size="sm"
            href={siteConfig.instagramUrl}
            target="_blank"
            leftIcon={<InstagramIcon className="w-4 h-4" />}
            showArrow
          >
            Follow
          </Button>
        </div>

        {/* Mobile Action & Menu Button */}
        <div className="flex sm:hidden items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            href={siteConfig.instagramUrl}
            target="_blank"
            leftIcon={<InstagramIcon className="w-4 h-4" />}
            showArrow
            className="px-4 py-2 text-[12px]"
          >
            Follow
          </Button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#F5F2E8] hover:text-[#39FF14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39FF14] rounded-lg transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-white/10 bg-[#0A0A0A]/95 px-6 py-5 backdrop-blur-xl"
          >
            <div className="flex flex-col gap-4">
              {siteConfig.navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-inter font-medium text-[15px] text-[#F5F2E8]/85 hover:text-[#39FF14] tracking-normal transition-colors py-1"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  href={siteConfig.instagramUrl}
                  target="_blank"
                  leftIcon={<InstagramIcon className="w-4 h-4" />}
                  showArrow
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3"
                >
                  Follow
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
