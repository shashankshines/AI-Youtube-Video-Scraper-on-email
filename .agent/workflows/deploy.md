---
description: Deploy the AI News Scraper to Cloudflare
---

# Deploying AI News Scraper

Follow these steps to deploy your automation to Cloudflare:

1. **Login to Cloudflare**
   ```bash
   npx wrangler login
   ```

2. **Set YouTube API Key**
   Get your key from Google Cloud Console.
   ```bash
   npx wrangler secret put YOUTUBE_API_KEY
   ```

3. **Set Resend API Key**
   Get your key from Resend.com.
   ```bash
   npx wrangler secret put RESEND_API_KEY
   ```

4. **Update Recipient Email (Optional)**
   The email is currently set to `shashankshines@gmail.com` in `wrangler.toml`. If you need to change it, update the `RECIPIENT_EMAIL` value in that file.

5. **Deploy**
   ```bash
   npx wrangler deploy
   ```

6. **Verify**
   Once deployed, you can verify it's working by visiting the worker URL with `?test` suffix (e.g., `https://ai-news-scraper-email.yourdomain.workers.dev/?test`).
