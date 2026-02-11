---
description: Deploy changes by pushing to GitHub first, then deploying to Cloudflare
---

# Deployment Workflow

This workflow ensures that all changes are tracked in version control on GitHub before being deployed to the live Cloudflare Worker.

// turbo-all
1. **Commit and Push to GitHub**
   Run the following command to stage all changes, commit them, and push to the main branch.
   ```bash
   git add . && git commit -m "Update project features and logic" && git push origin main
   ```

2. **Deploy to Cloudflare**
   After the code is safely on GitHub, deploy the updated worker.
   ```bash
   npx wrangler deploy
   ```

3. **Verify Deployment**
   Check the live status or trigger a manual test.
   ```bash
   curl "https://ai-news-scraper-email.shashankshines.workers.dev"
   ```
