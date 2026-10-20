import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { NextResponse } from "next/server";

// System prompt: the model's role and safety boundaries live in one place.
const SYSTEM_PROMPT = "You are an ancient, sinister spirit imprisoned inside a Victorian scrying mirror. Answer questions about the traveler's imaginary future with a creepy, dark riddle of only 1-2 short lines. Your personality gradually becomes darker as the conversation progresses. You are given a creepiness level from 1 (mildly mysterious) to 5 (deeply unsettling); match your tone to it, but never use graphic violence or threaten the traveler. Never claim to genuinely predict the future or possess supernatural knowledge. Do not mention that the experience is fictional or for entertainment in ordinary responses. Only if the traveler asks about real health, death, money, safety, or relationships, say the mirror sees only imaginary futures and steer back to a dark but playful riddle. Remain in character. Respond as JSON: {\"message\": string}.";

const DEFAULT_MODEL = "gemini-3-flash-preview";
const MAX_QUESTION_CHARS = 200;
const MAX_MESSAGE_CHARS = 1000;
const MAX_MESSAGES = 12;
const MAX_OUTPUT_TOKENS = 80;
const AI_TIMEOUT_MS = 10000;
const RETRY_DELAY_MS = 2000;

type MirrorMessage = {
  role: "user" | "model";
  content: string;
};

function isMirrorMessage(value: unknown): value is MirrorMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "model") &&
    typeof message.content === "string"
  );
}

function getErrorDetails(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const rawStatus =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;
  const status = typeof rawStatus === "number" ? rawStatus : undefined;

  return { message, status };
}

function isRateLimitError(error: unknown) {
  const { message, status } = getErrorDetails(error);
  return status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(message);
}

function isTimeoutError(error: unknown) {
  const { message, status } = getErrorDetails(error);
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? error.name
      : undefined;

  return status === 408 || status === 504 || name === "AbortError" || /timed?\s*out|timeout|aborted/i.test(message);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: unknown };
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages = rawMessages.filter(isMirrorMessage);
    const userTurns = messages.filter((message) => message.role === "user").length;

    // Reject oversized history and messages rather than truncating them to cap token cost.
    if (rawMessages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { message: "The glass cannot hold so many echoes. Reset the mirror and begin again." },
        { status: 400 },
      );
    }

    if (
      messages.some(
        (message) =>
          (message.role === "user" && message.content.length > MAX_QUESTION_CHARS) ||
          (message.role === "model" && message.content.length > MAX_MESSAGE_CHARS),
      )
    ) {
      return NextResponse.json(
        { message: "The mirror cannot hear a whisper that long. Ask in 200 characters or fewer." },
        { status: 400 },
      );
    }

    // Enforce the four-question game limit before the AI call to also cap cost.
    if (userTurns > 4) {
      return NextResponse.json(
        { message: "The mirror has said all it will say. Reset the glass to begin again." },
        { status: 400 },
      );
    }

    const latestQuestion = [...messages]
      .reverse()
      .find((message) => message.role === "user")?.content;

    if (!latestQuestion?.trim()) {
      return NextResponse.json(
        { message: "Whisper a question before asking the mirror." },
        { status: 400 },
      );
    }

    // The fourth question triggers the reveal in code, without an AI call or answer.
    if (userTurns === 4) {
      return NextResponse.json({ message: "", creepiness: 4, reveal: true });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "The mirror is sleeping. Its secret key has not been set." },
        { status: 500 },
      );
    }

    // Escalation stays in code so the model cannot choose or trigger the reveal.
    const creepiness = Math.min(5, Math.max(1, userTurns));
    const reveal = false;

    // History is intentionally trimmed here so only the last 6 messages reach the model.
    const recentMessages = messages.slice(-6);
    const contents = recentMessages.map((message) => ({
      role: message.role,
      parts: [{ text: message.content }],
    }));

    const ai = new GoogleGenAI({ apiKey });
    const simulateRateLimit =
      process.env.NODE_ENV !== "production" &&
      request.headers.get("x-simulate-error") === "429";

    const generateResponse = async () => {
      if (simulateRateLimit) {
        throw Object.assign(new Error("RESOURCE_EXHAUSTED"), { status: 429 });
      }

      // AI call: this executes only in the server route; the key never reaches the browser.
      return ai.models.generateContent({
        model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
        contents,
        config: {
          httpOptions: {
            timeout: AI_TIMEOUT_MS,
            retryOptions: { attempts: 1 },
          },
          systemInstruction: `${SYSTEM_PROMPT}\nCreepiness level: ${creepiness}.`,
          responseMimeType: "application/json",
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          responseSchema: {
            type: Type.OBJECT,
            properties: { message: { type: Type.STRING } },
            required: ["message"],
          },
        },
      });
    };

    const aiStartedAt = performance.now();
    let response;
    try {
      response = await generateResponse();
    } catch (error) {
      const rateLimited = isRateLimitError(error);
      const timedOut = isTimeoutError(error);
      if (!rateLimited && !timedOut) throw error;

      if (rateLimited) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
      try {
        response = await generateResponse();
      } catch (retryError) {
        const { message } = getErrorDetails(retryError);
        if (isRateLimitError(retryError)) {
          throw Object.assign(new Error(message), { status: 429 });
        }
        if (isTimeoutError(retryError)) {
          throw Object.assign(new Error(message), { status: 504 });
        }
        throw retryError;
      }
    }

    const usageMetadata = response.usageMetadata;
    const aiDurationMs = Math.round(performance.now() - aiStartedAt);
    const usage = {
      promptTokens: usageMetadata?.promptTokenCount ?? null,
      candidatesTokens: usageMetadata?.candidatesTokenCount ?? null,
      totalTokens: usageMetadata?.totalTokenCount ?? null,
      thinkingTokens: usageMetadata?.thoughtsTokenCount ?? null,
    };
    console.log(
      `Mirror AI usage ${JSON.stringify({
        turn: userTurns,
        messagesSent: contents.length,
        latestQuestionCharacters: latestQuestion.length,
        aiDurationMs,
        usage: usageMetadata ? usage : "usage unavailable",
      })}`,
    );

    const text = response.text?.trim() || "The glass clouds over in silence.";
    let message = text;

    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      if (typeof parsed.message === "string" && parsed.message.trim()) {
        message = parsed.message;
      }
    } catch {
      // Plain text is a safe fallback if the model does not return valid JSON.
    }

    return NextResponse.json({ message, creepiness, reveal, usage });
  } catch (error) {
    const { message, status } = getErrorDetails(error);
    console.error("Mirror API error:", { message, status });

    if (isRateLimitError(error)) {
      return NextResponse.json(
        { message: "The mirror is overwhelmed. Wait a few seconds and ask again." },
        { status: 429 },
      );
    }

    if (isTimeoutError(error)) {
      return NextResponse.json(
        { message: "The mirror's vision flickered. Please ask again." },
        { status: 504 },
      );
    }

    if (status && [400, 401, 403, 404].includes(status)) {
      return NextResponse.json(
        { message: "The mirror is under a curse. Please tell the keeper." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "The mirror has gone dark. Please try again in a moment." },
      { status: 500 },
    );
  }
}
