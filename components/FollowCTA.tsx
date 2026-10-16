"use client";

import React from "react";
import { siteConfig } from "@/data/site";
import { Mail } from "lucide-react";
import { Button, InstagramIcon } from "@/components/Button";

export const FollowCTA = () => {
  return (
    <section id="follow" className="relative w-full py-28 sm:py-36 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-[#0A0A0A] overflow-hidden text-center">
      {/* Soft neon green background glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] sm:h-[700px] sm:w-[700px] rounded-full bg-[radial-gradient(circle,rgba(57,255,20,0.12)_0%,rgba(57,255,20,0.03)_45%,transparent_70%)] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-5xl flex flex-col items-center">
        {/* Sub-badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#39FF14]/30 bg-[#39FF14]/10 px-4 py-1.5 mb-6">
          <span className="h-2 w-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
          <span className="t-label text-[#39FF14]">
            JOIN THE COMMUNITY
          </span>
        </div>

        {/* Giant Anton Line (.t-h2) */}
        <h2 className="t-h2 text-[#F5F2E8] mb-6">
          FOLLOW THE BUILD
        </h2>

        {/* Subtitle (.t-lead, max-w-[62ch]) */}
        <p className="t-lead text-[#F5F2E8]/75 mb-10 max-w-[62ch]">
          Catch the latest AI workflows, quantitative algorithms, and unfiltered build logs directly on Instagram.
        </p>

        {/* Action Buttons using reusable <Button> component */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          {/* Primary Follow Button */}
          <Button
            variant="primary"
            size="lg"
            href={siteConfig.instagramUrl}
            target="_blank"
            leftIcon={<InstagramIcon className="w-5 h-5" />}
            showArrow
            className="w-full sm:w-auto"
          >
            Follow @shwetdaily
          </Button>

          {/* Secondary Collab / Contact Button */}
          <Button
            variant="secondary"
            size="lg"
            href={`mailto:${siteConfig.email}?subject=Collaboration%20with%20Shwetank`}
            leftIcon={<Mail className="w-4 h-4 sm:w-5 sm:h-5 text-[#39FF14]" />}
            className="w-full sm:w-auto"
          >
            Collab / Contact
          </Button>
        </div>
      </div>
    </section>
  );
};
