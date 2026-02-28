const testTitle = "Gemini is Now the Best All-in-One AI & More AI Use Cases";
const testDesc = "Subscribe for weekly breakdowns on AI news you can actually use! In this video, Igor goes over the various updates and releases ...";
const combined = `${testTitle} The AI Advantage ${testDesc}`;

const aiDevKeywords = /\b(ai|chatgpt|gpt[-\s]?[o34-9]|gpt|openai|gemini|claude|anthropic|llm|llama|mistral|deepseek|copilot|midjourney|stable diffusion|dall[-\s]?e|sora|perplexity|ai agent|ai model|ai api|ai tool|ai coding|ai dev|ai development|machine learning|deep learning|neural network|transformer|fine[-\s]?tun|rag|langchain|vector database|hugging\s?face|open[-\s]?source ai|agi|reasoning model|multimodal|text[-\s]?to|embedding|tokeniz|inference|benchmark|parameter|ai chip|gpu|tpu|training data|ai safety|alignment|ai research|ai update|ai release|ai launch|ai news|ai breakthrough|ai startup|artificial intelligence|stock market|influencer|commercial|society)\b/i;

const excludeKeywords = /\b(upsc|ias|civil service|wion|firstpost|palki sharma|vantage|geopolit|military|war\b|attack|iran|weapon|drone strike|election|politics|modi|trump|biden|congress|parliament|prayer room|islamic|hindu|christian|religious|motivat|spiritual|yoga|horoscope|zodiac|cricket|football|soccer|nfl|ipl|bollywood|movie review|song|dance|recipe|cooking|fitness|workout|weight loss|makeup|beauty|skincare|real estate|stock market tip|forex|crypto pump|earn money online|side hustle|passive income)\b/i;

console.log("aiDevKeywords Match:", aiDevKeywords.test(combined));
console.log("excludeKeywords Match:", excludeKeywords.test(combined));
