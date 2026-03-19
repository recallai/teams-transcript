# Getting transcript from Microsoft Teams (real-time and async)

This repository demonstrates how to retrieve transcripts from a Microsoft Teams meeting using Recall.ai. To do this, you’ll need to send a bot to the meeting.

Clone the repository and follow the steps below.

# to do: add video explaining the set up for github

---

## Features
- Real-time transcription
- Async transcription

---

# Setup

## 1. Clone the repository

```bash
git clone <your-repo-url>
cd <repo-name>
```

---

## 2. Create a Recall.ai account and get API key
- [Recall.ai](https://us-west-2.recall.ai/dashboard/)

---

## 3. Add environment variables

Rename the .env.example file to .env and replace the following

```
RECALL_API_KEY=your_recall_api_key
RECALL_REGION=your_api_base_when_you_signup
```
RECALL_API_BASE is the base URL for your Recall region and is determined when you sign up for Recall.ai

US West 2 -> https://www.us-west-2.recall.ai

US East 1 -> https://www.us-east-1.recall.ai

EU -> https://www.eu-central-1.recall.ai

Asia -> https://www.ap-northeast-1.recall.ai

---

## 4. Load your .env file to your shell environment

```bash
export $(grep -v '^#' .env | xargs)
```

---

## 5. Install dependencies
From the root directory:

```bash
npm install
```
---

## 6. Start an ngrok Tunnel

[Recall.ai](https://us-west-2.recall.ai/dashboard/) requires a **public webhook endpoint**, so we expose the backend with ngrok. 

First make sure you add the authtoken on ngrok:

```bash
ngrok config add-authtoken <token>
```

Open a new terminal in your root directory, run:

```bash
ngrok http 3000
```

You will receive a URL similar to:

```
https://abc123.ngrok-free.app // this is YOUR_NGROK_URL
```

---

## 6. Set up webhooks for async transcription

Login to [Recall.ai](https://us-west-2.recall.ai/dashboard/) and it will take you to your dashboard, then configure the [webhook URL](https://docs.recall.ai/reference/webhooks-overview) under the Webhooks section.

Add the following endpoint:

```
https://YOUR_NGROK_URL/webhooks/recall
```

Example:

```
https://abc123.ngrok-free.app/webhooks/recall
```

Add events such as: 

- `recording.done`
- `transcript.done`

---

## 7. Configure curl.json file

Replace YOUR_TEAMS_MEETING_LINK with the link you want to send your meeting bot to.
Replace YOUR_NGROK_LINK with your ngrok link.

---

## 8. Start your terminal

Run 
```
node backend.js
```

---

## 9. Send bot to meeting and retrieve live transcription

Copy everything in curl.json, open a new terminal, and paste the value.


