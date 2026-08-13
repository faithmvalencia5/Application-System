import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import applicationRoutes from "./routes/applicationRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/applications", applicationRoutes);
app.use("/api/chatbot", chatbotRoutes);

app.get("/", (req, res) => {
    res.send("OSCA Backend is Running!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});