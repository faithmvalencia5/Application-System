import {
  askGemini
} from "../services/chatbotService.js";

export async function sendChatMessage(
  req,
  res
) {
  const {
    message,
    previousInteractionId
  } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({
      success: false,
      message: "Please enter a message."
    });
  }

  const sendEvent = (event, payload) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  // Keep the connection alive while the model is generating.
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  try {
    const result = await askGemini(
      String(message),
      previousInteractionId || null,
      (text) => sendEvent("token", { text })
    );

    // Local FAQ responses are returned as a complete answer, so send them
    // as one chunk; Gemini answers have already been streamed incrementally.
    if (result.source === "local_faq") {
      sendEvent("token", { text: result.reply });
    }

    sendEvent("done", {
      interactionId: result.interactionId || null,
      source: result.source || "gemini",
      faqId: result.faqId || null
    });
    res.end();
  } catch (error) {
    console.error("Chatbot response error:", error);

    sendEvent("chat_error", {
      message: "The chatbot is temporarily unavailable. Please try again."
    });
    res.end();
  }
}