import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export async function askGemini(
  message,
  previousInteractionId = null
) {
  if (!message || !message.trim()) {
    throw new Error("A message is required.");
  }

  const request = {
    model: "gemini-3.6-flash",
    input: message.trim()
  };

  if (previousInteractionId) {
    request.previous_interaction_id =
      previousInteractionId;
  }

  const interaction =
    await ai.interactions.create(request);

  const reply =
    interaction.output_text;

  if (!reply) {
    throw new Error(
      "Gemini did not return a response."
    );
  }

  return {
    reply: reply,
    interactionId: interaction.id
  };
}