import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RECALL_API_KEY = process.env.RECALL_API_KEY;
const RECALL_REGION = process.env.RECALL_REGION || "us-west-2";
const BASE_URL = `https://${RECALL_REGION}.recall.ai/api/v1`;

if (!RECALL_API_KEY) {
  throw new Error("Missing RECALL_API_KEY environment variable");
}

async function recallRequest(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Token ${RECALL_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(`Recall API error ${response.status}: ${text}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

app.get("/", (_req, res) => {
  res.send("Recall bot backend is running");
});

// Best practice: pass the meeting URL in the request body instead of hardcoding it.
app.post("/bots", async (req, res) => {
  try {
    const { meetingUrl, botName } = req.body;

    if (!meetingUrl) {
      return res.status(400).json({
        error: "meetingUrl is required"
      });
    }

    const bot = await recallRequest("/bot/", {
      method: "POST",
      body: JSON.stringify({
        meeting_url: meetingUrl,
        bot_name: botName || "Meeting Bot"
      })
    });

    return res.status(201).json({
      success: true,
      message: "Bot sent to meeting",
      botId: bot.id,
      status: bot.status,
      raw: bot
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message,
      details: err.data || null
    });
  }
});

// Optional helper endpoint to check bot status later.
app.get("/bots/:botId", async (req, res) => {
  try {
    const bot = await recallRequest(`/bot/${req.params.botId}/`, {
      method: "GET"
    });

    return res.json({
      success: true,
      botId: bot.id,
      status: bot.status,
      raw: bot
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message,
      details: err.data || null
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`POST http://localhost:${PORT}/bots`);
});
