"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

type MirrorSceneProps = {
  answer: string | null;
  answerKey: number;
  asking: boolean;
  breaking: boolean;
  creepiness: number;
  reducedMotion: boolean;
};

export function MirrorScene({ answer, answerKey, asking, breaking, creepiness, reducedMotion }: MirrorSceneProps) {
  const lines = answer?.split(/\r?\n/).filter((line) => line.trim()) ?? [];

  return (
    <div className={`mirror-scene creep-${creepiness}${breaking ? " is-breaking" : ""}`}>
      <Image
        className="mirror-art"
        src="/images/haunted-mirror-cutout.png"
        alt="An ornate oval Victorian mirror with cracked, smoky glass"
        width={1536}
        height={1024}
        sizes="(max-width: 900px) 100vw, 60vw"
        preload
      />
      <div className="glass-content">
        <div className="glass-reflection" aria-hidden="true" />
        <div className="glass-crack" aria-hidden="true" />
        <div className="mirror-response-scroll" aria-live="polite" aria-atomic="true">
          <AnimatePresence mode="wait" initial={false}>
            {!asking && answer && (
              <motion.div
                className="mirror-answer"
                key={answerKey}
                initial={reducedMotion ? false : { opacity: 0, filter: "blur(9px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={reducedMotion ? undefined : { opacity: 0, filter: "blur(5px)" }}
                transition={{ duration: reducedMotion ? 0 : 0.35 }}
              >
                <p className="sr-only">{answer}</p>
                <div aria-hidden="true" className="answer-lines">
                  {lines.map((line, index) => (
                    <motion.span
                      className="answer-line"
                      key={`${answerKey}-${index}`}
                      initial={reducedMotion ? false : { opacity: 0, y: 7 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.38, delay: reducedMotion ? 0 : index * 0.16 }}
                    >
                      {line}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
