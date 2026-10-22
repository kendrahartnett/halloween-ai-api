"use client";

import type { FormEvent, RefObject } from "react";

const MAX_QUESTION_CHARS = 200;

type QuestionComposerProps = {
  question: string;
  onQuestionChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  remaining: number;
  total: number;
  asking: boolean;
  error: string;
  hasHistory: boolean;
};

export function QuestionComposer({ question, onQuestionChange, onSubmit, onReset, inputRef, remaining, total, asking, error, hasHistory }: QuestionComposerProps) {
  return (
    <div className="composer-panel">
      <div className="whisper-marks" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className={index < total - remaining ? "is-spent" : ""} />
        ))}
      </div>
      <form onSubmit={onSubmit}>
        <div className="composer-heading">
          <label className="sr-only" htmlFor="question">Ask the glass a question</label>
          <span className="question-counter" aria-live="polite" aria-atomic="true">
            {remaining} Questions Remain.
            <br />
            <span className="question-invitation">The Glass is Ready to Reveal your Desires</span>
          </span>
        </div>
        <div className="composer-row">
          <input
            id="question"
            ref={inputRef}
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            maxLength={MAX_QUESTION_CHARS}
            placeholder="Be careful what you wish for.."
            disabled={asking || remaining === 0}
            aria-describedby="question-length"
            autoComplete="off"
          />
          <button type="submit" disabled={asking || remaining === 0 || !question.trim()}>
            {asking ? "Listening…" : "ENTER IF YOU DARE!"}
          </button>
        </div>
        <div className="composer-foot">
          <span className="composer-status" aria-live="polite">
            {asking ? "The silver stirs…" : ""}
          </span>
          <span id="question-length" className="character-counter">
            {question.length} / {MAX_QUESTION_CHARS}
          </span>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
      <div className="below-composer">
        <p className="disclaimer">Riddles are AI-generated for entertainment only. The mirror cannot see your real future.</p>
        {hasHistory && (
          <button className="reset-link" type="button" onClick={onReset}>
            Start over
          </button>
        )}
      </div>
    </div>
  );
}
