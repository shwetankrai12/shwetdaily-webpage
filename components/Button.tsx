"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";

export const InstagramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
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
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export interface ButtonProps {
  variant?: "primary" | "secondary";
  size?: "sm" | "lg";
  href?: string;
  target?: string;
  rel?: string;
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  showArrow?: boolean;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
}

export const Button = ({
  variant = "primary",
  size = "sm",
  href,
  target,
  rel,
  children,
  leftIcon,
  showArrow = false,
  className = "",
  onClick,
  type = "button",
  ariaLabel,
}: ButtonProps) => {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-full whitespace-nowrap min-h-[44px] transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39FF14] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] group select-none cursor-pointer";

  const sizeClasses =
    size === "sm"
      ? "px-5 py-2.5 font-inter font-bold text-[13px] tracking-[0.02em]"
      : "px-7 py-4 font-inter font-bold text-[16px] sm:text-[18px] tracking-[0.02em]";

  const variantClasses =
    variant === "primary"
      ? "bg-[#39FF14] text-[#0A0A0A] border border-[#39FF14] hover:bg-transparent hover:text-[#39FF14]"
      : "bg-transparent text-[#F5F2E8] border border-white/20 hover:border-[#39FF14] hover:text-[#39FF14]";

  const arrowSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4 sm:w-4.5 sm:h-4.5";

  const content = (
    <>
      {leftIcon && <span className="flex-shrink-0 flex items-center justify-center">{leftIcon}</span>}
      <span>{children}</span>
      {showArrow && (
        <ArrowUpRight
          className={`${arrowSize} flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5`}
          aria-hidden="true"
        />
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : rel}
        onClick={onClick}
        aria-label={ariaLabel}
        className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
    >
      {content}
    </button>
  );
};
