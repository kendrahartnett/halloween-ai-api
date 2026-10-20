"use client";

import { FormEvent, useState } from "react";

type ConversationMessage = {
  role: "user" | "model";
  content: string;
};

type MirrorResponse = {
  message: string;
  creepiness?: number;
  reveal?: boolean;
};

export default function Home() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [creepiness, setCreepiness] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function askMirror(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;

    const nextMessages: ConversationMessage[] = [
      ...messages,
      { role: "user", content: trimmedQuestion },
    ];

    setMessages(nextMessages);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/mirror", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const result = (await response.json()) as MirrorResponse;

      if (!response.ok) {
        throw new Error(result.message || "The mirror refuses to answer.");
      }

      // Result reaches the screen here by joining the visible conversation state.
      setMessages((current) => [
        ...current,
        { role: "model", content: result.message },
      ]);
      setCreepiness(result.creepiness ?? 1);
      setReveal(Boolean(result.reveal));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The mirror has gone dark. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function resetMirror() {
    setMessages([]);
    setQuestion("");
    setCreepiness(1);
    setReveal(false);
    setError("");
  }

  return (
    <main className={`chamber creep-${creepiness}`}>
      <div className="mist" aria-hidden="true" />
      <header className="title-block">
        <p className="eyebrow">An oracle of impossible tomorrows</p>
        <h1>Mirror, Mirror</h1>
        <p className="disclaimer">
          Entertainment only. The mirror cannot see your real future.
        </p>
      </header>

      <section className={`mirror-frame ${reveal ? "is-revealed" : ""}`}>
        <div className="mirror-glass">
          {reveal ? (
            <div className="reveal" role="img" aria-label="A spooky face appears in the mirror">
              <svg viewBox="0 0 240 300" aria-hidden="true">
                <path className="face" d="M120 20C55 20 31 74 38 151c5 56 35 123 82 136 47-13 77-80 82-136C209 74 185 20 120 20Z" />
                <path className="eye" d="M63 121c18-20 39-17 49 7-20 17-39 14-49-7Zm65 7c10-24 31-27 49-7-10 21-29 24-49 7Z" />
                <path className="mouth" d="M76 205c28-22 60-22 88 0-19 49-69 49-88 0Z" />
              </svg>
              <p>The thing behind the glass has seen you.</p>
              <button className="reset-button" type="button" onClick={resetMirror}>
                Reset mirror
              </button>
            </div>
          ) : (
            <>
              <div className="conversation" aria-live="polite">
                {messages.length === 0 && (
                  <p className="invitation">
                    Ask what waits beyond the candlelight&hellip;
                  </p>
                )}
                {messages.map((message, index) => (
                  <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
                    <span>{message.role === "user" ? "Traveler" : "The mirror"}</span>
                    <p>{message.content}</p>
                  </article>
                ))}
                {loading && <p className="thinking">The silver stirs&hellip;</p>}
              </div>

              <form className="question-form" onSubmit={askMirror}>
                <label htmlFor="question">Ask of your imaginary future</label>
                <div className="input-row">
                  <input
                    id="question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="What waits beyond the next moon?"
                    disabled={loading}
                    autoComplete="off"
                  />
                  <button type="submit" disabled={loading || !question.trim()}>
                    {loading ? "Listening…" : "Ask the mirror"}
                  </button>
                </div>
                {error && <p className="error" role="alert">{error}</p>}
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
