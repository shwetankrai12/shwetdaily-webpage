import React from "react";
import { SocialLinkItem } from "@/data/site";

export interface CableHubProps {
  links: SocialLinkItem[];
  order?: number[];
  activePortIndex: number | null;
  isSurging?: boolean;
  onPortPointerEnter?: (idx: number) => void;
  onPortPointerLeave?: (idx: number) => void;
  onPortClick?: (idx: number, e: React.PointerEvent) => void;
}

export const CableHub: React.FC<CableHubProps> = ({
  links,
  order,
  activePortIndex,
  isSurging = false,
  onPortPointerEnter,
  onPortPointerLeave,
  onPortClick,
}) => {
  const displayOrder = order && order.length === links.length ? order : links.map((_, i) => i);

  return (
    <div
      id="cable-hub"
      className="cable-hub-console"
      aria-label="Hardware Patch Hub"
      role="region"
    >
      {/* Top Screen Strip with shwetdaily.os and blinking cursor */}
      <div className="hub-screen-strip">
        <span className="hub-os-title">
          shwetdaily.os<span className="hub-cursor">_</span>
        </span>
        <span className="hub-status-pill">ONLINE</span>
      </div>

      {/* Socket row with N ports */}
      <div className="hub-ports-row">
        {displayOrder.map((linkIdx) => {
          const link = links[linkIdx];
          if (!link) return null;
          const isLit = isSurging || activePortIndex === linkIdx;
          const label =
            link.id === "instagram"
              ? "IG"
              : link.id === "github"
              ? "GH"
              : link.id === "linkedin"
              ? "IN"
              : link.name.slice(0, 2).toUpperCase();

          return (
            <div
              key={link.id}
              data-port={link.id}
              data-port-index={linkIdx}
              className={`hub-port-col ${isLit ? "lit" : ""}`}
              onPointerEnter={() => onPortPointerEnter?.(linkIdx)}
              onPointerLeave={() => onPortPointerLeave?.(linkIdx)}
              onPointerDown={(e) => onPortClick?.(linkIdx, e)}
              role="button"
              tabIndex={0}
              aria-label={`Patch port ${label}: ${link.name}`}
            >
              {/* LED Indicator and Label */}
              <div className="hub-port-header">
                <span className="hub-port-led" aria-hidden="true" />
                <span className="hub-port-label">{label}</span>
              </div>

              {/* Physical Socket Jack at bottom edge for plug attachment */}
              <div
                data-port-jack-index={linkIdx}
                className="hub-jack-socket"
                aria-hidden="true"
              >
                <div className="hub-jack-inner" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

