import {
  askGemini
} from "../services/chatbotService.js";

export async function sendChatMessage(
  req,
  res
) {
  try {
    const {
      message,
      previousInteractionId
    } = req.body;

    if (
      !message ||
      !String(message).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a message."
      });
    }

    const result =
      await askGemini(
        String(message),
        previousInteractionId || null
      );

    return res.status(200).json({
      success: true,

      reply:
        result.reply,

      interactionId:
        result.interactionId,

      source:
        result.source || "gemini",

      faqId:
        result.faqId || null
    });

  } catch (error) {
    console.error(
      "Gemini chatbot error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "The chatbot is temporarily unavailable. Please try again."
    });
  }
}