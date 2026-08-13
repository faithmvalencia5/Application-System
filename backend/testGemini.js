import "dotenv/config";
import { askGemini } from "./services/chatbotService.js";

async function testGemini() {
  try {
    console.log("Testing Gemini connection...");

    const reply = await askGemini(
      "Reply with exactly: Gemini connection successful."
    );

    console.log("\nGemini response:");
    console.log(reply);

  } catch (error) {
    console.error("\nGemini test failed:");
    console.error(error);
  }
}

testGemini();