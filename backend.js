import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RECALL_API_KEY = process.env.RECALL_API_KEY;
const RECALL_REGION = process.env.RECALL_REGION || "us-west-2";
const BASE_URL = `https://${RECALL_REGION}.recall.ai/api/v1`;

// For simple webhook verification, use a random secret.
const REALTIME_WEBHOOK_TOKEN = process.env.REALTIME_WEBHOOK_TOKEN || "change-me";

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

// Existing: send bot with no real-time transcript config.
// Good for post-meeting async transcription only.
app.post("/bots", async (req, res) => {
  try {
    const { meetingUrl, botName } = req.body;

    if (!meetingUrl) {
      return res.status(400).json({ error: "meetingUrl is required" });
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
      mode: "post_meeting_only",
      botId: bot.id,
      status: bot.status
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message,
      details: err.data || null
    });
  }
});

// New: send bot with real-time transcription enabled.
app.post("/bots/realtime", async (req, res) => {
  try {
    console.log("HJOTT")
    const { meetingUrl, botName } = req.body;

    if (!meetingUrl) {
      return res.status(400).json({ error: "meetingUrl is required" });
    }

    const realtimeWebhookUrl =
      `${process.env.PUBLIC_BASE_URL}/webhooks/recall/realtime?token=${encodeURIComponent(REALTIME_WEBHOOK_TOKEN)}`;

    const bot = await recallRequest("/bot/", {
      method: "POST",
      body: JSON.stringify({
        meeting_url: meetingUrl,
        bot_name: botName || "Realtime Meeting Bot",
        recording_config: {
          transcript: {
            provider: {
              recallai_streaming: {
                mode: "prioritize_low_latency"
              }
            }
          },
          realtime_endpoints: [
            {
              type: "webhook",
              url: realtimeWebhookUrl,
              events: ["transcript.data", "transcript.partial_data"]
            }
          ]
        }
      })
    });

    return res.status(201).json({
      success: true,
      mode: "realtime",
      botId: bot.id,
      status: bot.status
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message,
      details: err.data || null
    });
  }
});

// Real-time transcript webhook.
// This receives utterances while the bot is in the call.
app.post("/webhook/recall/transcript", (req, res) => {
const event = req.body?.event;

  if (event === "transcript.partial_data") {
    const transcript = req.body?.data?.data;
    const participant = transcript?.participant;
    const words = transcript?.words || [];

    const text = words.map((w) => w.text).join(" ").trim();

    console.log({
      event, // transcript.partial_data or transcript.data
      speaker: participant?.name || "Unknown",
      speakerId: participant?.id || null,
      languageCode: transcript?.language_code || null,
      text
    });
  }

  res.json({ ok: true });
});

// Post-meeting webhook for async transcription flow.
app.post("/webhooks/recall", async (req, res) => {
  const event = req.body?.event;

  try {
    if (event === "recording.done") {
      const recordingId = req.body?.data?.recording?.id;
      if (!recordingId) {
        return res.json({ ok: true, ignored: true });
      }

      const transcriptJob = await recallRequest(
        `/recording/${recordingId}/create_transcript/`,
        {
          method: "POST",
          body: JSON.stringify({
            provider: {
              recallai_async: {
                language_code: "en"
              }
            }
          })
        }
      );

      console.log("Started async transcription:", transcriptJob.id);

      return res.json({ ok: true });
    }

    if (event === "transcript.done") {
      const transcriptId = req.body?.data?.transcript?.id;
      if (!transcriptId) {
        return res.json({ ok: true, ignored: true });
      }

      const transcript = await recallRequest(`/transcript/${transcriptId}/`, {
        method: "GET"
      });

      console.log("Transcript ready:", transcript.data?.download_url || null);

      return res.json({ ok: true });
    }

    return res.json({ ok: true, ignored: true });
  } catch (err) {
    return res.status(err.status || 500).json({
      ok: false,
      error: err.message
    });
  }
});

// Post-meeting webhook for async transcription flow.
app.get("/", async (req, res) => {
  console.log("Hit")
    return res.json({ ok: true, ignored: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`POST http://localhost:${PORT}/bots`);
  console.log(`POST http://localhost:${PORT}/bots/realtime`);
  console.log(`POST http://localhost:${PORT}/webhooks/recall`);
  console.log(`POST http://localhost:${PORT}/'webhooks/recall/realtime'`);
});