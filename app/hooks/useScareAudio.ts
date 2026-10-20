"use client";

import { Howl } from "howler";
import { useCallback, useEffect, useRef } from "react";

export function useScareAudio() {
  const swishRef = useRef<Howl | null>(null);
  const radioRef = useRef<Howl | null>(null);
  const sequenceRef = useRef(0);

  useEffect(() => {
    swishRef.current = new Howl({ src: ["/audio/jumpscare.wav"], preload: true, volume: 0.7 });
    radioRef.current = new Howl({ src: ["/audio/terror-radio-frequency.wav"], preload: true, volume: 0.48 });

    return () => {
      sequenceRef.current += 1;
      swishRef.current?.unload();
      radioRef.current?.unload();
      swishRef.current = null;
      radioRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    sequenceRef.current += 1;
    swishRef.current?.off("end");
    swishRef.current?.stop();
    radioRef.current?.stop();
  }, []);

  const play = useCallback(() => {
    stop();
    const swish = swishRef.current;
    const radio = radioRef.current;
    if (!swish || !radio) return;

    const sequence = sequenceRef.current;
    const soundId = swish.play();
    // The second clip starts when the first ends; a reset invalidates this sequence.
    swish.once("end", () => {
      if (sequence === sequenceRef.current) radio.play();
    }, soundId);
  }, [stop]);

  return { play, stop };
}
