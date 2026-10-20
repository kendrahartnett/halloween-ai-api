"use client";

import { useReducedMotion } from "motion/react";
import { FormEvent, useRef, useState } from "react";
import { MirrorScene } from "./components/MirrorScene";
import { QuestionComposer } from "./components/QuestionComposer";
import { ScareOverlay } from "./components/ScareOverlay";
import { useScareAudio } from "./hooks/useScareAudio";

const MAX_QUESTIONS = 4;

type ConversationMessage = {
  role: "user" | "model";
  content: string;
};

type MirrorResponse = {
  message: string;
  creepiness?: number;
  reveal?: boolean;
};

type ExperienceState = "idle" | "asking" | "scare-pending" | "scare";

export default function Home() {
  const reducedMotion = useReducedMotion() ?? false;
  const { play, stop } = useScareAudio();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [creepiness, setCreepiness] = useState(1);
  const [experience, setExperience] = useState<ExperienceState>("idle");
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);
  const questionRef = useRef<HTMLInputElement>(null);

  const questionsAsked = messages.filter((message) => message.role === "user").length;
  const questionsRemaining = Math.max(0, MAX_QUESTIONS - questionsAsked);
  const answers = messages.filter((message) => message.role === "model");
  const latestAnswer = answers.at(-1)?.content ?? null;
  const asking = experience === "asking";
  const scareActive = experience === "scare-pending" || experience === "scare";

  async function askMirror(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || experience !== "idle" || questionsRemaining === 0) return;

    const nextMessages: ConversationMessage[] = [
      ...messages,
      { role: "user", content: trimmedQuestion },
    ];
    const finalQuestion = questionsAsked + 1 === MAX_QUESTIONS;
    const requestId = ++requestIdRef.current;

    setMessages(nextMessages);
    setQuestion("");
    setError("");
    setExperience(finalQuestion ? "scare-pending" : "asking");
    if (finalQuestion) play();

    try {
      const response = await fetch("/api/mirror", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const result = (await response.json()) as MirrorResponse;
      if (requestId !== requestIdRef.current) return;

      if (!response.ok) throw new Error(result.message || "The mirror refuses to answer.");

      if (finalQuestion) {
        if (!result.reveal) throw new Error("The glass clouds over. Please try again.");
        setExperience("scare");
      } else {
        if (result.reveal || !result.message?.trim()) {
          throw new Error("The glass clouds over. Please try again.");
        }
        // The response reaches the glass here; prior turns remain only in request history.
        setMessages([...nextMessages, { role: "model", content: result.message }]);
        setCreepiness(result.creepiness ?? 1);
        setExperience("idle");
      }
    } catch (caught) {
      if (requestId !== requestIdRef.current) return;
      if (finalQuestion) stop();
      setMessages(messages);
      setQuestion(trimmedQuestion);
      setExperience("idle");
      setError(caught instanceof Error ? caught.message : "The mirror has gone dark. Please try again.");
      requestAnimationFrame(() => questionRef.current?.focus());
    }
  }

  function resetMirror() {
    requestIdRef.current += 1;
    stop();
    setMessages([]);
    setQuestion("");
    setCreepiness(1);
    setExperience("idle");
    setError("");
    requestAnimationFrame(() => questionRef.current?.focus());
  }

  return (
    <main className={`chamber creep-${creepiness}`}>
      <section className="experience" aria-label="The haunted mirror" inert={scareActive}>
        <header className="title-block">
          <h1>The Black Glass</h1>
          <p className="subtitle">Every question comes with a price.</p>
        </header>
        <div className="experience-controls">
          <QuestionComposer
            question={question}
            onQuestionChange={setQuestion}
            onSubmit={askMirror}
            onReset={resetMirror}
            inputRef={questionRef}
            remaining={questionsRemaining}
            total={MAX_QUESTIONS}
            asking={experience !== "idle"}
            error={error}
            hasHistory={messages.length > 0}
          />
        </div>
        <div className="scene-stage">
          <MirrorScene
            answer={latestAnswer}
            answerKey={answers.length}
            asking={asking}
            breaking={scareActive}
            creepiness={creepiness}
            reducedMotion={reducedMotion}
          />
        </div>
      </section>

      <ScareOverlay active={scareActive} reducedMotion={reducedMotion} onReset={resetMirror} />
    </main>
  );
}
