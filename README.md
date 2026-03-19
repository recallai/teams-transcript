# Getting transcript from Microsoft Teams (real-time and async)

This repository demonstrates how to retrieve transcripts from a [Microsoft Teams](https://www.recall.ai/product/meeting-bot-api/microsoft-teams) meeting using [Recall.ai](https://www.recall.ai). To do this, you’ll need to send a bot to the meeting.

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

## 2. Create a Recall.ai account 
- Get your [Recall.ai](https://us-west-2.recall.ai/dashboard/) API key

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
In your terminal, run:

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

Replace YOUR_TEAMS_MEETING_LINK with the Microsoft Teams meeting link you want to send your meeting bot to.
Replace YOUR_NGROK_LINK with your ngrok link.

![curl.png](images/curl.png)

---

## 8. Start your terminal

In your terminal, run: 
```
node backend.js
```

---

## 9. Run curl command to send bot to meeting and retrieve live transcription

Open a new terminal, copy everything in curl.json, and run the curl command in the terminal.

Let the bot into the meeting. Both real-time and async transcription are now available to you.

# How it works

1. Send meeting bot into Microsoft Teams meeting
2. Real-time transcription begins
3. When the meeting ends, Recall.ai returns `recording.done`
4. Async transcription begins, Recall.ai returns `transcription.done` when transcript URL is ready

# Tech stack

- Recall.ai's [Meeting Bot API](https://www.recall.ai/product/meeting-bot-api)
- [Ngrok](https://www.ngrok.com)
  
