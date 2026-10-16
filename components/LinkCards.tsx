import React from "react";
import { SocialLinkItem } from "@/data/site";

interface LinkCardsProps {
  links: SocialLinkItem[];
  activeCardIndex: number | null;
  pluggedMap: Record<number, boolean>;
  onCardPointerEnter?: (index: number) => void;
  onCardPointerLeave?: (index: number) => void;
  onCardFocus?: (index: number) => void;
  onCardBlur?: (index: number) => void;
  onCardPointerDown?: (index: number, e: React.PointerEvent) => void;
}

export const LinkCards: React.FC<LinkCardsProps> = ({
  links,
  activeCardIndex,
  pluggedMap,
  onCardPointerEnter,
  onCardPointerLeave,
  onCardFocus,
  onCardBlur,
  onCardPointerDown,
}) => {
  // Render icon based on link ID
  const renderIcon = (id: string) => {
    switch (id) {
      case "instagram":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <path d="M17.5 6.5h.01" />
          </svg>
        );
      case "github":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        );
      case "linkedin":
      default:
        // Lucide-style LinkedIn icon as required
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect x="2" y="9" width="4" height="12" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        );
    }
  };

  return (
    <nav aria-label="Social links" className="link-cards-nav w-full">
      {links.map((link, idx) => {
        const isPlugged = Boolean(pluggedMap[idx]);
        const isActive = activeCardIndex === idx;

        // Card state label for desktop microcopy
        const stateLabel = isActive ? "POWERED" : isPlugged ? "PATCHED // READY" : "PATCHING...";

        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            data-link-index={idx}
            data-link-id={link.id}
            data-state={stateLabel}
            aria-label={`${link.name} ${link.handle}`}
            style={{ "--brand": link.color } as React.CSSProperties}
            className={`link-card group ${isPlugged ? "plugged" : ""} ${isActive ? "on" : ""}`}
            onPointerEnter={() => onCardPointerEnter?.(idx)}
            onPointerLeave={() => onCardPointerLeave?.(idx)}
            onFocus={() => onCardFocus?.(idx)}
            onBlur={() => onCardBlur?.(idx)}
            onPointerDown={(e) => onCardPointerDown?.(idx, e)}
          >
            {/* Hardware Socket Component */}
            <div
              data-sock-index={idx}
              className="sock-target"
              aria-hidden="true"
            >
              <div className="sock-inner" />
            </div>

            {/* Icon Block */}
            <div className="link-card-icon" aria-hidden="true">
              {renderIcon(link.id)}
            </div>

            {/* Text info */}
            <div className="link-card-info">
              <span className="link-card-name">
                {link.name}
                <span className="status-dot" aria-hidden="true" />
              </span>
              <span className="link-card-handle">{link.handle}</span>
            </div>
          </a>
        );
      })}
    </nav>
  );
};
