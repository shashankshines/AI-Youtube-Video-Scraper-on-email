# AI YouTube News Scraper & Emailer

This project is a Cloudflare Worker that scrapes the top AI-related YouTube videos from the last 72 hours, filters them for English language and a minimum subscriber count (>= 300k), and sends a beautifully formatted email daily.

## Features
- **Scraping**: Uses YouTube Data API v3 to find videos across multiple targeted AI dev queries.
- **Language Filtering**: Strict English-only filtering using metadata, script detection (no Devanagari/regional scripts), and keyword checks.
- **Authority Filtering**: Only includes videos from channels with **>= 300,000 subscribers** to ensure high-quality content.
- **Emailing**: Sends a premium HTML email via Resend API with scoring based on relevance and velocity.
- **Automation**: Runs daily using Cloudflare Cron Triggers.
- **Hosting**: Designed for Cloudflare Workers (Free Tier).

## Setup Instructions

### 1. Get API Keys
- **YouTube Data API v3**: Go to [Google Cloud Console](https://console.cloud.google.com/), create a project, enable "YouTube Data API v3", and create an API Key.
- **Resend API**: Go to [Resend.com](https://resend.com/), create an account, and get an API Key.

### 2. Configure Secrets
Run the following commands to add your API keys to the Cloudflare environment:
```bash
npx wrangler secret put YOUTUBE_API_KEY
npx wrangler secret put RESEND_API_KEY
```

### 3. Deploy
Log in to your Cloudflare account and deploy:
```bash
npx wrangler login
npx wrangler deploy
```

## Testing Locally
To test the scraper without deploying:
1. Create a `.dev.vars` file in the root directory:
   ```env
   YOUTUBE_API_KEY=your_youtube_api_key
   RESEND_API_KEY=your_resend_api_key
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:8787/?test` in your browser to trigger a manual run.

## Workflow
A custom workflow has been created for you at `.agent/workflows/deploy.md`.
