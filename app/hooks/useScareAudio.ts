"use client";

import { Howl } from "howler";
import { useCallback, useEffect, useRef } from "react";

export function useScareAudio() {
  const screamRef = useRef<Howl | null>(null);
  const swishRef = useRef<Howl | null>(null);
  const radioRef = useRef<Howl | null>(null);
  const sequenceRef = useRef(0);

  useEffect(() => {
    screamRef.current = new Howl({ src: ["/audio/horror-scream.wav"], preload: true, volume: 0.7 });
    swishRef.current = new Howl({ src: ["/audio/jumpscare.wav"], preload: true, volume: 0.7 });
    radioRef.current = new Howl({ src: ["/audio/terror-radio-frequency.wav"], preload: true, volume: 0.48 });

    return () => {
      sequenceRef.current += 1;
      screamRef.current?.unload();
      swishRef.current?.unload();
      radioRef.current?.unload();
      swishRef.current = null;
      screamRef.current = null;
      radioRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    sequenceRef.current += 1;
    screamRef.current?.off("end");
    screamRef.current?.stop();
    swishRef.current?.off("end");
    swishRef.current?.stop();
    radioRef.current?.stop();
  }, []);

  const play = useCallback(() => {
    stop();
    const scream = screamRef.current;
    const swish = swishRef.current;
    const radio = radioRef.current;
    if (!scream || !swish || !radio) return;

    const sequence = sequenceRef.current;
    // Scream, then swish, then radio; reset invalidates every pending transition.
    const screamId = scream.play();
    scream.once("end", () => {
      if (sequence !== sequenceRef.current) return;
      const swishId = swish.play();
      swish.once("end", () => {
        if (sequence === sequenceRef.current) radio.play();
      }, swishId);
    }, screamId);
  }, [stop]);

  return { play, stop };
}
