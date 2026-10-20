import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

// System prompt: the model's role and safety boundaries live in one place.
const SYSTEM_PROMPT = "You are a mysterious spirit trapped inside a haunted mirror who answers questions about the traveler's imaginary future through short, eerie riddles (2-3 lines). Everything you say is fiction for entertainment, and you never present a prediction as real or true. If the traveler asks about real health, death, money, safety, or relationships, say the mirror only sees imaginary futures and steer back to a playful riddle. You are given a creepiness level from 1 (mildly mysterious) to 5 (deeply unsettling); match your tone to it, but never use graphic violence or threaten the traveler. Respond as JSON: {\"message\": string}.";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: unknown };
    const messages = Array.isArray(body.messages)
      ? body.messages.filter(isMirrorMessage)
      : [];
    const latestQuestion = [...messages]
      .reverse()
      .find((message) => message.role === "user")?.content;

    if (!latestQuestion?.trim()) {
      return NextResponse.json(
        { message: "Whisper a question before asking the mirror." },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "The mirror is sleeping. Its secret key has not been set." },
        { status: 500 },
      );
    }

    const userTurns = messages.filter((message) => message.role === "user").length;
    // Escalation stays in code so the model cannot choose or trigger the reveal.
    const creepiness = Math.min(5, Math.max(1, userTurns));
    const reveal = creepiness === 5;

    // History is intentionally trimmed here so only the last 6 messages reach the model.
    const recentMessages = messages.slice(-6);
    const contents = recentMessages.map((message) => ({
      role: message.role,
      parts: [{ text: message.content }],
    }));

    const ai = new GoogleGenAI({ apiKey });
    // AI call: this executes only in the server route; the key never reaches the browser.
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      contents,
      config: {
        systemInstruction: `${SYSTEM_PROMPT}\nCreepiness level: ${creepiness}.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { message: { type: Type.STRING } },
          required: ["message"],
        },
      },
    });

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

    return NextResponse.json({ message, creepiness, reveal });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? error.status
        : undefined;
    console.error("Mirror API error:", { message, status });

    return NextResponse.json(
      { message: "The mirror has gone dark. Please try again in a moment." },
      { status: 500 },
    );
  }
}
