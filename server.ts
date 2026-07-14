import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set up body parsers (large limit for base64 doc uploads)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined. AI functionality will be offline.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "dummy_key",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

const ai = getGeminiClient();

// API endpoint for Pine Script v6 Generation
app.post("/api/gemini/generate-pinescript", async (req, res) => {
  try {
    const { prompt, fileData, fileName, fileMimeType, videoUrl } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing on the server. Please add it to your Secrets.",
      });
    }

    let searchGroundingEnabled = false;
    let finalPrompt = `You are an elite financial algorithm developer and TradingView Pine Script v6 specialist.
Your task is to write high-quality, fully functional Pine Script v6 code.

Follow these strict constraints:
1. Always start the script with: //@version=6
2. Use indicator() for standalone studies or strategy() for backtesting systems.
3. Use strict v6 namespace functions, e.g., ta.sma, ta.ema, ta.rsi, ta.macd, ta.crossover.
4. Avoid any deprecated Pine Script syntax (e.g. do not use study(), do not use security() without proper parameters, do not mix version syntax).
5. The generated script must be completely compile-ready and free of syntax errors.
6. Provide customizable inputs using input.int(), input.float(), input.bool(), or input.string() so the user can easily optimize values.

User request: "${prompt}"
`;

    if (videoUrl) {
      searchGroundingEnabled = true;
      finalPrompt += `\n\nAdditionally, the user has provided a reference Trading Strategy Video URL: ${videoUrl}.
Use Google Search grounding to look up this strategy or video and extract its trading rules, setup indicators, risk management parameters, and exact criteria. Incorporate this strategy into the generated Pine Script code.`;
    }

    const contents: any[] = [];

    // Include file attachments if uploaded
    if (fileData && fileMimeType) {
      contents.push({
        inlineData: {
          mimeType: fileMimeType,
          data: fileData, // Base64 string
        },
      });
      finalPrompt += `\n\nAdditionally, the user has uploaded an attachment named "${fileName || "document"}". Analyze the trading logic, flowchart, or charts in this document and write the Pine Script following its logic exactly.`;
    }

    contents.push({ text: finalPrompt });

    // Request structured JSON response
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: "You are a professional quantitative developer. Produce clean, strictly formatted JSON responses containing Pine Script v6 code, a markdown explanation of the strategy, customizable inputs for the UI, and a set of realistic buy/sell signals simulated over historical gold (XAUUSD) charts for the Strategy Tester panel.",
        responseMimeType: "application/json",
        tools: searchGroundingEnabled ? [{ googleSearch: {} }] : [],
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "The name of the strategy or indicator.",
            },
            pinescript: {
              type: Type.STRING,
              description: "The complete, compile-ready Pine Script v6 code. Must start with //@version=6.",
            },
            explanation: {
              type: Type.STRING,
              description: "A comprehensive markdown explanation of the rules, setup, entry/exit criteria, and risk settings.",
            },
            parameters: {
              type: Type.ARRAY,
              description: "A list of input variables configured in the Pine Script that the user can tune via the UI.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Friendly display name of the parameter." },
                  key: { type: Type.STRING, description: "The exact variable name used in the Pine Script." },
                  type: { type: Type.STRING, description: "Parameter type: 'number', 'boolean', or 'string'." },
                  default: { type: Type.STRING, description: "The default value (as a string to support floats/ints/booleans/strings)." },
                  min: { type: Type.STRING, description: "Optional minimum value limit." },
                  max: { type: Type.STRING, description: "Optional maximum value limit." },
                },
                required: ["name", "key", "type", "default"],
              },
            },
            simulatedSignals: {
              type: Type.ARRAY,
              description: "An array of 15 to 30 realistic backtesting buy/sell trade execution records for XAUUSD over the last 30 days. These trades should simulate how the generated script performs on historical gold data.",
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "The trade date (YYYY-MM-DD)." },
                  type: { type: Type.STRING, description: "Trade type: 'BUY' or 'SELL'." },
                  price: { type: Type.NUMBER, description: "The price at which the trade was executed (matching realistic Gold prices around $2300-$2450)." },
                  qty: { type: Type.NUMBER, description: "The trade size/quantity." },
                  profit: { type: Type.NUMBER, description: "The profit or loss of this completed trade in USD (positive or negative)." },
                  comment: { type: Type.STRING, description: "Brief trade logic trigger explanation." },
                },
                required: ["date", "type", "price", "qty", "profit", "comment"],
              },
            },
          },
          required: ["name", "pinescript", "explanation", "parameters", "simulatedSignals"],
        },
      },
    });

    const jsonText = response.text;
    res.setHeader("Content-Type", "application/json");
    res.send(jsonText);
  } catch (error: any) {
    console.error("Error generating Pine Script:", error);
    res.status(500).json({ error: error?.message || "An unexpected error occurred during Pine Script generation." });
  }
});

// Setup Vite Dev Server / Serve Static Files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
