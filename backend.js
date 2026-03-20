import express from "express";
import "dotenv/config";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RECALL_API_KEY = process.env.RECALL_API_KEY;
const RECALL_REGION = process.env.RECALL_REGION || "us-west-2";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;

const BASE_URL = `https://${RECALL_REGION}.recall.ai/api/v1`;

if (!RECALL_API_KEY) {
  throw new Error("Missing RECALL_API_KEY environment variable");
}

if (!PUBLIC_BASE_URL) {
  throw new Error("Missing PUBLIC_BASE_URL environment variable");
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

// Create bot with live transcription
app.post("/bots/realtime", async (req, res) => {
  try {
    const { meetingUrl, botName } = req.body;

    if (!meetingUrl) {
      return res.status(400).json({ error: "meetingUrl is required" });
    }

    const realtimeWebhookUrl = `${PUBLIC_BASE_URL}/webhook/recall/transcript`;

    const bot = await recallRequest("/bot/", {
      method: "POST",
      body: JSON.stringify({
        meeting_url: meetingUrl,
        bot_name: botName || "Realtime Meeting Bot",
        recording_config: {
          transcript: {
            provider: {
              recallai_streaming: {
                mode: "prioritize_low_latency",
                language_code: "en"
              }
            },
            diarization: {
              use_separate_streams_when_available: true
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

// Live transcript events
app.post("/webhook/recall/transcript", (req, res) => {
  const event = req.body?.event;

  if (event === "transcript.partial_data" || event === "transcript.data") {
    const transcript = req.body?.data?.data;
    const participant = transcript?.participant;
    const words = transcript?.words || [];
    const text = words.map((w) => w.text).join(" ").trim();

    console.log({
      event,
      speaker: participant?.name || "Unknown",
      speakerId: participant?.id || null,
      languageCode: transcript?.language_code || null,
      text
    });
  }

  return res.json({ ok: true });
});

// Status webhook: configure this separately in Recall webhook settings
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

      const transcriptDownloadUrl = transcript?.data?.download_url || null;

      console.log("Transcript ready:", transcriptDownloadUrl);

      return res.json({
        ok: true,
        transcriptDownloadUrl
      });
    }

    if (event === "transcript.failed") {
      console.log("Transcript failed:", req.body);
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`POST http://localhost:${PORT}/bots/realtime`);
  console.log(`POST ${PUBLIC_BASE_URL}/webhook/recall/transcript`);
  console.log(`POST ${PUBLIC_BASE_URL}/webhooks/recall`);
});