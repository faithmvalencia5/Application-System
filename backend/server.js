import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import applicationRoutes from "./routes/applicationRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";

dotenv.config();

const app = express();

// Keep infrastructure probes cheap: these endpoints do not query Supabase,
// call verification services, or initialize third-party AI clients.
function sendHealthResponse(req, res) {
    res.set("Cache-Control", "no-store");
    return res.status(200).json({
        status: "ok",
        service: "osca-application-backend",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
}

app.disable("x-powered-by");
const defaultAllowedOrigins=["https://osca-application.techsite.live","https://www.osca-application.techsite.live","https://osca-management.techsite.live","https://www.osca-management.techsite.live","http://localhost:5500","http://127.0.0.1:5500","http://localhost:3000","http://127.0.0.1:3000"];
const allowedOrigins=new Set([...defaultAllowedOrigins,...(process.env.CORS_ALLOWED_ORIGINS||"").split(",").map(v=>v.trim()).filter(Boolean)]);
app.use(cors({origin(origin,cb){if(!origin||allowedOrigins.has(origin))return cb(null,true);return cb(null,false);},methods:["GET","POST","PUT","PATCH","DELETE","OPTIONS"],allowedHeaders:["Content-Type","Authorization"],optionsSuccessStatus:204}));
app.use((req,res,next)=>{res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");res.setHeader("X-Frame-Options","SAMEORIGIN");if(req.secure||req.headers["x-forwarded-proto"]==="https")res.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains");next();});
app.use(express.json({ limit: "2mb" }));

// Lightweight probes for Render health checks and external uptime monitors.
app.get("/", (req, res) => {
    res.set("Cache-Control", "no-store");
    return res.status(200).send("OSCA Backend is Running!");
});
app.get("/health", sendHealthResponse);
app.get("/healthz", sendHealthResponse);

// Record request duration without logging request bodies or personal data.
// This helps distinguish Render cold starts from slow downstream operations.
app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        if (req.path !== "/health" && req.path !== "/healthz") {
            console.info(
                `[http] ${req.method} ${req.path} ${res.statusCode} ${durationMs.toFixed(1)}ms`
            );
        }
    });
    next();
});

app.use("/api/applications", applicationRoutes);
app.use("/api/chatbot", chatbotRoutes);

// Return a predictable JSON error for malformed/unexpected request errors.
app.use((error, req, res, next) => {
    console.error("[http] Unhandled request error:", error?.message || error);
    if (res.headersSent) return next(error);
    return res.status(error?.status || 500).json({
        success: false,
        message: error?.status && error.status < 500
            ? error.message
            : "The backend could not complete the request. Please try again."
    });
});

// Export the Express application for Vercel's serverless runtime.
export default app;

// Keep the existing local/Render server behavior. Vercel invokes the
// exported application directly and must not start a nested HTTP listener.
if (!process.env.VERCEL) {
    const PORT = Number(process.env.PORT) || 3000;
    const server = app.listen(PORT, "0.0.0.0", () => {
        console.info(`OSCA backend listening on port ${PORT}`);
    });

    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;

    function shutdown(signal) {
        console.info(`Received ${signal}; closing HTTP server.`);
        server.close((error) => {
            if (error) {
                console.error("Error while closing HTTP server:", error);
                process.exitCode = 1;
            }
        });
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}
