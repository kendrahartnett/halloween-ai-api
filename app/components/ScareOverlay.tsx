"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";

type ScareOverlayProps = {
  active: boolean;
  reducedMotion: boolean;
  onReset: () => void;
};

export function ScareOverlay({ active, reducedMotion, onReset }: ScareOverlayProps) {
  const resetRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (active) resetRef.current?.focus();
  }, [active]);

  useEffect(() => {
    const image = new window.Image();
    image.src = "/images/mirror-entity.png";
  }, []);

  return (
    <div
      className={`scare-screen${active ? " is-active" : ""}`}
      role={active ? "dialog" : undefined}
      aria-modal={active ? true : undefined}
      aria-label={active ? "The mirror has shattered" : undefined}
      aria-hidden={!active}
    >
      <div className="scare-flash" aria-hidden="true" />
      <motion.div
        className="scare-art"
        role="img"
        aria-label="A ghostly figure bursts through a cracked mirror"
        initial={false}
        animate={active
          ? { opacity: 1, scale: reducedMotion ? 1 : 1.1 }
          : { opacity: 0, scale: reducedMotion ? 1 : 0.28 }}
        transition={{ duration: reducedMotion ? 0 : 0.3, delay: active && !reducedMotion ? 0.09 : 0, ease: [0.12, 0.9, 0.2, 1] }}
      >
        <div className="entity-art" aria-hidden="true" />
      </motion.div>
      {active && (
        <button className="scare-reset" type="button" onClick={onReset} ref={resetRef}>
          Reset mirror
        </button>
      )}
    </div>
  );
}
