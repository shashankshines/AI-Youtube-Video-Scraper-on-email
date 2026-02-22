
const aiDevKeywords = /\b(ai|chatgpt|gpt[-\s]?[o34-9]|gpt|openai|gemini|claude|anthropic|llm|llama|mistral|deepseek|copilot|midjourney|stable diffusion|dall[-\s]?e|sora|perplexity|ai agent|ai model|ai api|ai tool|ai coding|ai dev|ai development|machine learning|deep learning|neural network|transformer|fine[-\s]?tun|rag|langchain|vector database|hugging\s?face|open[-\s]?source ai|agi|reasoning model|multimodal|text[-\s]?to|embedding|tokeniz|inference|benchmark|parameter|ai chip|gpu|tpu|training data|ai safety|alignment|ai research|ai update|ai release|ai launch|ai news|ai breakthrough|ai startup|artificial intelligence|stock market|influencer|commercial|society)\b/i;
const excludeKeywords = /\b(upsc|ias|civil service|wion|firstpost|palki sharma|vantage|geopolit|military|war\b|attack|iran|weapon|drone strike|election|politics|modi|trump|biden|congress|parliament|prayer room|islamic|hindu|christian|religious|motivat|spiritual|yoga|horoscope|zodiac|cricket|football|soccer|nfl|ipl|bollywood|movie review|song|dance|recipe|cooking|fitness|workout|weight loss|makeup|beauty|skincare|real estate|stock market tip|forex|crypto pump|earn money online|side hustle|passive income)\b/i;
const nonEnglishScript = /[^\u0000-\u024F\u1E00-\u1EFF\u2000-\u206F\u2070-\u209F\u2100-\u214F\u2150-\u218F\u2C60-\u2C7F\uA720-\uA7FF]/;
const regionalKeywords = /\b(hindi|telugu|tamil|kannada|malayalam|bengali|marathi|gujarati|urdu|punjabi)\b/i;

const mockVideos = [
    {
        id: 'passed_1',
        title: 'GPT-5 Released? Everything You Need to Know',
        viewCount: 1500000,
        channelTitle: 'AI Explained',
        durationSeconds: 720,
        audioLanguage: 'en',
        defaultLanguage: 'en',
        subscriberCount: 500000,
        description: 'New model update.',
        privacyStatus: 'public',
        uploadStatus: 'processed',
        thumbnail: 'exists'
    },
    {
        id: 'filtered_private',
        title: 'Secret AI Video',
        viewCount: 50000,
        channelTitle: 'Secret Channel',
        durationSeconds: 600,
        audioLanguage: 'en',
        subscriberCount: 1000000,
        description: 'Hidden content.',
        privacyStatus: 'private',
        uploadStatus: 'processed',
        thumbnail: 'exists'
    },
    {
        id: 'filtered_unprocessed',
        title: 'Draft AI News',
        viewCount: 10000,
        channelTitle: 'News Channel',
        durationSeconds: 300,
        audioLanguage: 'en',
        subscriberCount: 400000,
        description: 'Still uploading.',
        privacyStatus: 'public',
        uploadStatus: 'uploading',
        thumbnail: 'exists'
    },
    {
        id: 'filtered_no_thumb',
        title: 'Broken AI Video',
        viewCount: 50000,
        channelTitle: 'Bad Channel',
        durationSeconds: 650,
        audioLanguage: 'en',
        subscriberCount: 400000,
        description: 'No thumbnail.',
        privacyStatus: 'public',
        uploadStatus: 'processed',
        thumbnail: null
    }
];

function filterVideos(videos) {
    return videos.filter(video => {
        const title = video.title;
        const channel = video.channelTitle;
        const combined = `${title} ${channel} ${video.description || ''}`;

        if (video.durationSeconds < 180) return false;
        if (video.viewCount < 100) return false;
        if (!aiDevKeywords.test(combined)) return false;
        if (excludeKeywords.test(combined)) return false;

        const audioLang = (video.audioLanguage || '').toLowerCase();
        const defaultLang = (video.defaultLanguage || '').toLowerCase();
        if (audioLang && !audioLang.startsWith('en')) return false;
        if (defaultLang && !defaultLang.startsWith('en')) return false;

        if (nonEnglishScript.test(title)) return false;
        if (regionalKeywords.test(title)) return false;

        if (video.subscriberCount !== undefined && video.subscriberCount < 300000) return false;

        // Status Filter
        if (video.privacyStatus && video.privacyStatus !== 'public') return false;
        if (video.uploadStatus && video.uploadStatus !== 'processed') return false;
        if (!video.thumbnail) return false;

        return true;
    });
}

const filtered = filterVideos(mockVideos);
console.log('Filtered Videos:', filtered.map(v => v.title));

const failedReasons = [];
if (filtered.length !== 1) failedReasons.push(`Expected 1 video, got ${filtered.length}`);
if (filtered.some(v => v.id.includes('filtered'))) failedReasons.push('Broken/Private video not filtered');

if (failedReasons.length === 0) {
    console.log('✅ TEST PASSED: Link status filters working correctly.');
} else {
    console.log('❌ TEST FAILED:', failedReasons.join(', '));
}
