# AI YouTube News Scraper & Emailer

This project is a Cloudflare Worker that scrapes the top AI-related YouTube videos from the last 24 hours (with at least 10k views) and sends a beautifully formatted email daily.

## Features
- **Scraping**: Uses YouTube Data API v3 to find videos.
- **Filtering**: Specifically looks for AI content with >10,000 views in the last 24 hours.
- **Emailing**: Sends a premium HTML email via Resend API.
- **Automation**: Runs daily at 00:00 UTC using Cloudflare Cron Triggers.
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
