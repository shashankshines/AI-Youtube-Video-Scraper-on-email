export interface Env {
    YOUTUBE_API_KEY: string;
    RESEND_API_KEY: string;
    RECIPIENT_EMAIL: string;
}

interface YouTubeVideo {
    id: string;
    title: string;
    thumbnail: string;
    viewCount: number;
    likeCount: number;
    publishedAt: string;
    channelTitle: string;
    channelId: string;
    durationSeconds: number;
    audioLanguage?: string;
    defaultLanguage?: string;
    description?: string;
    subscriberCount?: number;
    privacyStatus?: string;
    uploadStatus?: string;
}

export default {
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        console.log('Starting daily AI YouTube video scraping...');
        await scrapeAndSendEmail(env);
    },

    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        if (url.searchParams.has('debug_api')) {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=AI+news+today&type=video&publishedAfter=${yesterday}&key=${env.YOUTUBE_API_KEY}`;
            const response = await fetch(searchUrl);
            const data = await response.json();
            return new Response(JSON.stringify({ url: searchUrl.replace(env.YOUTUBE_API_KEY, '***'), data }, null, 2), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (url.searchParams.has('test')) {
            const result = await scrapeAndSendEmail(env, true);
            return new Response(JSON.stringify(result, null, 2), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (url.searchParams.has('unsubscribe')) {
            return new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Unsubscribed</title>
                    <style>
                        body { font-family: -apple-system, system-ui, sans-serif; text-align: center; padding: 50px; background: #f9fafb; color: #111827; }
                        .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: inline-block; max-width: 400px; }
                        h1 { color: #4f46e5; margin-bottom: 16px; }
                        p { color: #4b5563; line-height: 1.5; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h1>Unsubscribe Request</h1>
                        <p>To be successfully removed from the AI Dev News daily mailing list, please contact us directly at:</p>
                        <div style="margin: 24px 0; padding: 12px; background: #f3f4f6; border-radius: 8px; font-weight: 600; color: #4f46e5;">
                            shashankshines@gmail.com
                        </div>
                        <p>Once you send your request, we will manually remove your email from the system immediately. Thank you!</p>
                    </div>
                </body>
                </html>
            `, { headers: { 'Content-Type': 'text/html' } });
        }

        return new Response('AI News Scraper is running. Use ?test to trigger manually. Use ?debug_api to check YouTube API connectivity.');
    },
};

async function scrapeAndSendEmail(env: Env, isTest: boolean = false) {
    const logs: string[] = [];
    if (isTest) {
        logs.push('Triggering manual test with mock data...');
        const videos = getMockVideos();
        const emailResult = await sendEmail(env, videos, logs);
        logs.push(`Successfully sent test email with ${videos.length} mock videos.`);
        return { success: true, videoCount: videos.length, emailResult, logs };
    }

    logs.push('Starting daily AI YouTube video scraping...');
    try {
        const videos = await getTopAIVideos(env.YOUTUBE_API_KEY, logs);

        if (videos.length === 0) {
            logs.push('No videos found matching the criteria.');
            return { success: false, logs };
        }

        const emailResult = await sendEmail(env, videos, logs);
        logs.push(`Successfully sent email with ${videos.length} videos.`);
        return { success: true, videoCount: videos.length, emailResult, logs };
    } catch (error: any) {
        logs.push(`Error: ${error.message}`);
        return { success: false, logs };
    }
}

/**
 * Parses ISO 8601 duration (e.g. PT1H2M30S) to total seconds
 */
function parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Performs a single YouTube search query and returns video IDs
 */
async function searchYouTube(apiKey: string, query: string, publishedAfter: string, maxResults: number = 25, channelId?: string): Promise<string[]> {
    const params = new URLSearchParams({
        part: 'snippet',
        maxResults: maxResults.toString(),
        type: 'video',
        publishedAfter: publishedAfter,
        key: apiKey
    });

    if (query) {
        params.append('q', query);
    }

    if (channelId) {
        params.append('channelId', channelId);
        params.append('order', 'date'); // Get latest first for channel search
    } else {
        params.append('order', 'relevance');
        params.append('relevanceLanguage', 'en');
    }

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
    const response = await fetch(searchUrl);
    const data: any = await response.json();

    if (data.error) {
        throw new Error(`YouTube API Error: ${data.error.message} (${data.error.code})`);
    }

    if (!data.items || data.items.length === 0) {
        return [];
    }

    return data.items.map((item: any) => item.id.videoId);
}

/**
 * Fetches detailed video stats for a list of video IDs
 */
async function getVideoDetails(apiKey: string, videoIds: string[]): Promise<YouTubeVideo[]> {
    if (videoIds.length === 0) return [];

    // YouTube API accepts max 50 IDs per request
    const ids = videoIds.slice(0, 50).join(',');
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,status&id=${ids}&key=${apiKey}`;
    const response = await fetch(statsUrl);
    const data: any = await response.json();

    if (!data.items) return [];

    const videos = data.items.map((item: any) => {
        return {
            id: item.id,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
            viewCount: parseInt(item.statistics?.viewCount || '0'),
            likeCount: parseInt(item.statistics?.likeCount || '0'),
            publishedAt: item.snippet.publishedAt,
            channelTitle: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
            durationSeconds: parseDuration(item.contentDetails?.duration || 'PT0S'),
            audioLanguage: item.snippet.defaultAudioLanguage,
            defaultLanguage: item.snippet.defaultLanguage,
            description: item.snippet.description,
            privacyStatus: item.status?.privacyStatus,
            uploadStatus: item.status?.uploadStatus,
        };
    });

    // Fetch channel subscriber counts in batches
    const channelIds = Array.from(new Set(videos.map((v: any) => v.channelId))).join(',');
    if (channelIds) {
        const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelIds}&key=${apiKey}`;
        const channelResponse = await fetch(channelUrl);
        const channelData: any = await channelResponse.json();

        const subCounts: Record<string, number> = {};
        channelData.items?.forEach((item: any) => {
            subCounts[item.id] = parseInt(item.statistics?.subscriberCount || '0');
        });

        videos.forEach((v: any) => {
            v.subscriberCount = subCounts[v.channelId] || 0;
        });
    }

    return videos;
}

async function getTopAIVideos(apiKey: string, logs: string[]): Promise<YouTubeVideo[]> {
    // Search within the last 72 hours to ensure we catch content from the last few days
    const publishedAfter = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    // Focused search queries for AI DEVELOPMENT news — models, APIs, tools, coding, research
    const searchQueries = [
        // Model releases & updates
        'new AI model released today',
        'OpenAI GPT new release update',
        'Google Gemini developer update',
        'Claude Anthropic API update',
        'open source LLM new release',
        'DeepSeek Mistral Llama model update',
        // Developer tools & coding
        'AI coding tool developer news',
        'AI API launch developer',
        'GitHub Copilot AI developer tool update',
        'AI framework library release',
        // Research & breakthroughs
        'AI research paper breakthrough',
        'machine learning engineering news',
        // Industry dev news
        'AI startup funding launch product',
        'AI infrastructure GPU training news',
        'AI videos Vaibhav Sisinty',
    ];

    logs.push(`Running ${searchQueries.length} search queries for AI dev news...`);

    const searchPromises = [
        // Prioritize Vaibhav Sisinty's content
        searchYouTube(apiKey, '@vaibhavsisinty', publishedAfter, 10),
        searchYouTube(apiKey, 'AI', publishedAfter, 10, 'UClXAalunTPaX1YV185DWUeg'),
        ...searchQueries.map(query => searchYouTube(apiKey, query, publishedAfter, 15)),
    ];
    const searchResults = await Promise.all(searchPromises);

    // Collect all unique video IDs
    const allVideoIds = new Set<string>();
    searchResults.forEach((ids, index) => {
        let queryLabel = '';
        if (index === 0) queryLabel = '@vaibhavsisinty';
        else if (index === 1) queryLabel = 'Vaibhav Channel ID Search';
        else queryLabel = searchQueries[index - 2];

        logs.push(`Query "${queryLabel}": found ${ids.length} results`);
        ids.forEach(id => allVideoIds.add(id));
    });

    logs.push(`Total unique video IDs collected: ${allVideoIds.size}`);

    if (allVideoIds.size === 0) {
        return [];
    }

    // Fetch details in batches of 50
    const idArray = Array.from(allVideoIds);
    const batches: string[][] = [];
    for (let i = 0; i < idArray.length; i += 50) {
        batches.push(idArray.slice(i, i + 50));
    }

    const detailPromises = batches.map(batch => getVideoDetails(apiKey, batch));
    const detailResults = await Promise.all(detailPromises);
    const allVideos = detailResults.flat();

    logs.push(`Fetched details for ${allVideos.length} videos.`);

    // --- POSITIVE FILTER: Title must mention AI dev-relevant keywords ---
    const aiDevKeywords = /\b(ai|chatgpt|gpt[-\s]?[o34-9]|gpt|openai|gemini|claude|anthropic|llm|llama|mistral|deepseek|copilot|midjourney|stable diffusion|dall[-\s]?e|sora|perplexity|ai agent|ai model|ai api|ai tool|ai coding|ai dev|ai development|machine learning|deep learning|neural network|transformer|fine[-\s]?tun|rag|langchain|vector database|hugging\s?face|open[-\s]?source ai|agi|reasoning model|multimodal|text[-\s]?to|embedding|tokeniz|inference|benchmark|parameter|ai chip|gpu|tpu|training data|ai safety|alignment|ai research|ai update|ai release|ai launch|ai news|ai breakthrough|ai startup|artificial intelligence|stock market|influencer|commercial|society)\b/i;

    // --- NEGATIVE FILTER: Exclude non-dev content (geopolitics, entertainment, generic) ---
    const excludeKeywords = /\b(upsc|ias|civil service|wion|firstpost|palki sharma|vantage|geopolit|military|war\b|attack|iran|weapon|drone strike|election|politics|modi|trump|biden|congress|parliament|prayer room|islamic|hindu|christian|religious|motivat|spiritual|yoga|horoscope|zodiac|cricket|football|soccer|nfl|ipl|bollywood|movie review|song|dance|recipe|cooking|fitness|workout|weight loss|makeup|beauty|skincare|real estate|stock market tip|forex|crypto pump|earn money online|side hustle|passive income)\b/i;

    // --- LANGUAGE FILTER: Check for non-Latin characters (Devanagari, Arabric, etc.) to catch regional titles ---
    const nonEnglishScript = /[^\u0000-\u024F\u1E00-\u1EFF\u2000-\u206F\u2070-\u209F\u2100-\u214F\u2150-\u218F\u2C60-\u2C7F\uA720-\uA7FF]/;

    const filteredVideos = allVideos
        .filter(video => {
            const title = video.title;
            const channel = video.channelTitle;
            const combined = `${title} ${channel} ${video.description || ''}`;

            // Minimum 3 minutes — real dev content is longer
            if (video.durationSeconds < 180) return false;
            // Minimum 100 views (lowered to ensure Vaibhav's newer videos are caught)
            if (video.viewCount < 100) return false;
            // Must pass positive AI dev keyword check
            if (!aiDevKeywords.test(combined)) return false;
            // Must NOT match excluded topics
            if (excludeKeywords.test(combined)) return false;

            // Strict Language Filtering
            // 1. Check metadata
            const audioLang = (video.audioLanguage || '').toLowerCase();
            const defaultLang = (video.defaultLanguage || '').toLowerCase();
            if (audioLang && !audioLang.startsWith('en')) return false;
            if (defaultLang && !defaultLang.startsWith('en')) return false;

            // 2. Check for non-English script in title (catch Hindi/Regional scripts)
            if (nonEnglishScript.test(title)) return false;

            // 3. Heuristic: Regional keywords in title that might not be caught by excludeKeywords
            const regionalKeywords = /\b(hindi|telugu|tamil|kannada|malayalam|bengali|marathi|gujarati|urdu|punjabi)\b/i;
            if (regionalKeywords.test(title)) return false;

            // 4. Subscriber Count Filter (>= 300k)
            if (video.subscriberCount !== undefined && video.subscriberCount < 300000) return false;

            // 5. Broken Link / Status Filter
            // Must be public and fully processed
            if (video.privacyStatus && video.privacyStatus !== 'public') return false;
            if (video.uploadStatus && video.uploadStatus !== 'processed') return false;
            // Ensure thumbnail exists
            if (!video.thumbnail) return false;

            return true;
        });

    logs.push(`After filtering: ${filteredVideos.length} AI dev videos remain.`);

    // Known AI dev-focused channels get a scoring bonus
    const devChannels = new Set([
        'matthew berman', 'fireship', 'wes roth', 'matt wolfe', 'ai explained',
        'mattvidpro ai', 'the ai advantage', 'all about ai', 'ai jason',
        'david ondrej', 'worldofai', 'sam witteveen', 'james briggs',
        'nicholas renotte', 'sentdex', 'two minute papers', 'yannic kilcher',
        'ai search', 'prompt engineering', 'mervin praison', 'corbin brown',
        'code with ania kubów', 'tech with tim', 'krish naik', 'codebasics',
        'varun mayya', 'tkssharma', 'traversy media', 'deeplizard',
        'statquest', '3blue1brown', 'andrej karpathy', 'lex fridman',
        'vaibhav sisinty',
    ]);

    // Score videos by a combination of views, recency, and channel quality
    const now = Date.now();
    const scoredVideos = filteredVideos.map(video => {
        const ageHours = (now - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60);
        const viewsPerHour = video.viewCount / Math.max(ageHours, 1);
        // Base score: blend of raw views and velocity
        let score = video.viewCount * 0.3 + viewsPerHour * 100 * 0.7;
        // Bonus for known AI dev channels
        if (devChannels.has(video.channelTitle.toLowerCase())) {
            score *= 1.5;
        }
        return { ...video, score };
    });

    // Sort by score and take top 10
    scoredVideos.sort((a, b) => b.score - a.score);
    const topVideos = scoredVideos.slice(0, 10);

    return topVideos;
}

async function sendEmail(env: Env, videos: YouTubeVideo[], logs: string[]) {
    // Construct the unsubscribe link (pointing to the worker URL)
    const unsubscribeUrl = `https://ai-news-scraper-email.shashankshines.workers.dev/?unsubscribe=true`;
    const emailHtml = generateEmailHtml(videos, unsubscribeUrl);
    const recipients = env.RECIPIENT_EMAIL.split(',').map(email => email.trim());

    logs.push(`Sending individual emails to: ${recipients.join(', ')}`);
    logs.push(`From: AI Dev News <notifications@resend.dev>`);

    const results = [];
    for (const recipient of recipients) {
        try {
            logs.push(`Triggering email to: ${recipient}...`);
            const resendResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${env.RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: 'AI Dev News <notifications@resend.dev>',
                    to: [recipient],
                    subject: `⚡ AI Dev News — Top 10 Videos — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`,
                    html: emailHtml,
                }),
            });

            const responseBody = await resendResponse.text();
            logs.push(`Resend API response for ${recipient}: ${resendResponse.status} ${responseBody}`);

            if (resendResponse.ok) {
                results.push({ recipient, success: true, response: JSON.parse(responseBody) });
            } else {
                results.push({ recipient, success: false, error: responseBody });
            }
        } catch (error: any) {
            logs.push(`Error sending to ${recipient}: ${error.message}`);
            results.push({ recipient, success: false, error: error.message });
        }
    }

    return results;
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViews(views: number): string {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
}

function generateEmailHtml(videos: YouTubeVideo[], unsubscribeUrl: string) {
    const videoItems = videos
        .map(
            (video, index) => `
        <tr>
            <td style="padding: 0 0 24px 0;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <tr>
                        <td>
                            <a href="https://www.youtube.com/watch?v=${video.id}" style="text-decoration: none;">
                                <img src="${video.thumbnail}" width="100%" style="display: block; border-radius: 12px 12px 0 0;" alt="${video.title}"/>
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 16px 20px 20px 20px;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td>
                                        <span style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; letter-spacing: 0.5px;">#${index + 1}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 10px;">
                                        <a href="https://www.youtube.com/watch?v=${video.id}" style="text-decoration: none; color: #1a1a2e; font-size: 17px; font-weight: 600; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${video.title}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 12px;">
                                        <table cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="font-size: 13px; color: #6b7280; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                                    <strong style="color: #4b5563;">${video.channelTitle}</strong>
                                                    &nbsp;&bull;&nbsp; ${formatViews(video.viewCount)} views
                                                    &nbsp;&bull;&nbsp; ${formatDuration(video.durationSeconds)}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 6px;">
                                        <span style="font-size: 12px; color: #9ca3af; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">📅 Uploaded: ${new Date(video.publishedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 14px;">
                                        <a href="https://www.youtube.com/watch?v=${video.id}" style="display: inline-block; padding: 10px 24px; background: #ff0000; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">▶ Watch Now</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>`
        )
        .join('');

    const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f0f0f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f0f0f5;">
            <tr>
                <td align="center" style="padding: 30px 16px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px;">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 30px; background: linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7); border-radius: 16px 16px 0 0; text-align: center;">
                                <h1 style="margin: 0; font-size: 28px; color: #ffffff; font-weight: 700; letter-spacing: -0.5px;">⚡ AI Dev News Daily</h1>
                                <p style="margin: 8px 0 0 0; font-size: 15px; color: rgba(255,255,255,0.85);">Top 10 AI development videos — models, tools & breakthroughs</p>
                                <p style="margin: 6px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.65);">${dateStr}</p>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 24px 20px; background-color: #f5f3ff; border-radius: 0 0 16px 16px;">
                                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                    ${videoItems}
                                </table>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px 20px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; color: #9ca3af;">Sent automatically by your AI News Scraper</p>
                                <p style="margin: 6px 0 0 0; font-size: 11px; color: #d1d5db;">&copy; ${new Date().getFullYear()} AI News Scraper &bull; Hosted on Cloudflare Workers</p>
                                <p style="margin: 12px 0 0 0; font-size: 11px;">
                                    <a href="${unsubscribeUrl}" style="color: #6366f1; text-decoration: underline;">Unsubscribe</a>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`;
}

function getMockVideos(): YouTubeVideo[] {
    return [
        {
            id: 'dQw4w9WgXcQ',
            title: 'GPT-5 Released? Everything You Need to Know',
            thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            viewCount: 1500000,
            likeCount: 45000,
            publishedAt: new Date().toISOString(),
            channelTitle: 'AI Explained',
            channelId: 'UC57XajGVB9nN1L-0_y6k4fA',
            durationSeconds: 720,
            subscriberCount: 500000,
        },
        {
            id: 'W6u3oBv_OVM',
            title: 'How to use AI to 10x your productivity - My Secret Workflow',
            thumbnail: 'https://i.ytimg.com/vi/W6u3oBv_OVM/maxresdefault.jpg',
            viewCount: 50000,
            likeCount: 3500,
            publishedAt: new Date().toISOString(),
            channelTitle: 'Vaibhav Sisinty',
            channelId: 'UClXAalunTPaX1YV185DWUeg',
            durationSeconds: 650,
            subscriberCount: 400000,
        },
        {
            id: 'T-D1K7xqTyA',
            title: 'New Open Source LLM Beats GPT-4',
            thumbnail: 'https://i.ytimg.com/vi/T-D1K7xqTyA/maxresdefault.jpg',
            viewCount: 850000,
            likeCount: 25000,
            publishedAt: new Date().toISOString(),
            channelTitle: 'Matthew Berman',
            channelId: 'UCyw6LzOatIDV9V7L3CAtLtw',
            durationSeconds: 900,
            subscriberCount: 350000,
        },
        {
            id: 'aircAruvnKk',
            title: 'AI Dev Tools: 10x Your Productivity',
            thumbnail: 'https://i.ytimg.com/vi/aircAruvnKk/maxresdefault.jpg',
            viewCount: 300000,
            likeCount: 12000,
            publishedAt: new Date().toISOString(),
            channelTitle: 'Fireship',
            channelId: 'UCsBjURrP617_EStu12pZ4gQ',
            durationSeconds: 185,
            audioLanguage: 'en',
            defaultLanguage: 'en',
            description: 'Top 10 AI tools for developers in 2024.',
            subscriberCount: 2000000,
        },
        {
            id: 'hindi_test_1',
            title: 'AI क्या है? (What is AI in Hindi)',
            thumbnail: 'https://i.ytimg.com/vi/hindi_test_1/default.jpg',
            viewCount: 5000,
            likeCount: 500,
            publishedAt: new Date().toISOString(),
            channelTitle: 'Tech Hindi',
            channelId: 'hi_1',
            durationSeconds: 600,
            audioLanguage: 'hi',
            defaultLanguage: 'hi',
            description: 'Artificial Intelligence explained in Hindi.',
            subscriberCount: 1000000,
        },
        {
            id: 'hindi_test_2',
            title: 'Top 10 AI Tools in Hindi',
            thumbnail: 'https://i.ytimg.com/vi/hindi_test_2/default.jpg',
            viewCount: 2000,
            likeCount: 200,
            publishedAt: new Date().toISOString(),
            channelTitle: 'AI Dev Hindi',
            channelId: 'hi_2',
            durationSeconds: 400,
            audioLanguage: 'hi',
            defaultLanguage: 'en',
            description: 'Learn AI tools in Hindi language.',
            subscriberCount: 500000,
            privacyStatus: 'public',
            uploadStatus: 'processed',
        },
        {
            id: 'private_video',
            title: 'Top Secret AI Project (English)',
            thumbnail: 'https://i.ytimg.com/vi/private_video/default.jpg',
            viewCount: 10000,
            likeCount: 1000,
            publishedAt: new Date().toISOString(),
            channelTitle: 'Leaker AI',
            channelId: 'leak_1',
            durationSeconds: 300,
            subscriberCount: 500000,
            privacyStatus: 'private',
            uploadStatus: 'processed',
        },
        {
            id: 'unprocessed_video',
            title: 'Fresh AI News (English)',
            thumbnail: 'https://i.ytimg.com/vi/unprocessed_video/default.jpg',
            viewCount: 500,
            likeCount: 50,
            publishedAt: new Date().toISOString(),
            channelTitle: 'News AI',
            channelId: 'news_1',
            durationSeconds: 300,
            subscriberCount: 500000,
            privacyStatus: 'public',
            uploadStatus: 'uploading',
        }
    ];
}
