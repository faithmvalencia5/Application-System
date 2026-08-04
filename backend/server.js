import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import applicationRoutes from "./routes/applicationRoutes.js";

dotenv.config();

const app = express();

app.use(cors({
    origin: [
        "https://application-system-kappa.vercel.app",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ]
}));
app.use(express.json());
app.use("/api/applications", applicationRoutes);

app.get("/", (req, res) => {
    res.send("OSCA Backend is Running!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});