"use client";

const VARIANTS = {
  default: "glass",
  subtle: "glass-subtle",
  highlight: "glass-highlight",
};

export default function GlassCard({
  children,
  className = "",
  variant = "default",
  animate = false,
  delay = 0,
}) {
  const base = VARIANTS[variant] || VARIANTS.default;
  const animClass = animate ? "anim-slide-up" : "";
  const delayClass = delay > 0 ? `delay-${delay}` : "";

  return (
    <div className={`${base} p-5 ${animClass} ${delayClass} ${className}`}>
      {children}
    </div>
  );
}
