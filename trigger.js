import { fetch } from 'undici';

async function triggerScheduledEvent() {
    try {
        const response = await fetch('https://ai-news-scraper-email.shashankshines.workers.dev', {
            method: 'POST',
            body: JSON.stringify({ type: "scheduled" }), // Cloudflare workers local dev does this sometimes, but remote might not accept it directly
            headers: { 'Content-Type': 'application/json' }
        });
        const text = await response.text();
        console.log(response.status, text);
    } catch (e) {
        console.error(e);
    }
}
triggerScheduledEvent();
