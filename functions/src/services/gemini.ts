import axios from 'axios';

// Expand ENV to include GEMINI_API_KEY
const getApiKey = () => {
  return process.env.GEMINI_API_KEY || '';
};

export interface AIGenerationRequest {
  campaignType: string;
  marketingTone: string;
  language: 'English' | 'Tanglish';
  festivalName?: string;
  customInstructions?: string;
}

export interface AIGenerationResult {
  title: string;
  body: string;
  emoji: string;
  ctaText: string;
}

export const generateCampaignContent = async (
  params: AIGenerationRequest
): Promise<AIGenerationResult> => {
  const apiKey = getApiKey();
  const { campaignType, marketingTone, language, festivalName, customInstructions } = params;

  // Rule-based fallbacks in case the API key is missing or fails
  const getFallback = (): AIGenerationResult => {
    const isTanglish = language === 'Tanglish';
    switch (campaignType) {
      case 'Promotional':
      case 'Flash Sale':
        return {
          title: isTanglish ? '⚡ Flash Sale is Live! Super Offer!' : '⚡ Flash Sale Alert!',
          body: isTanglish 
            ? '🔥 3D printers and filaments mela top discounts! Click panni order pannunga fast-ah!'
            : '🔥 Grab up to 30% OFF on premium 3D printers & filaments. Limited stock—shop now!',
          emoji: '⚡',
          ctaText: 'Shop Now'
        };
      case 'New Product':
        return {
          title: isTanglish ? '🆕 Pudhu Product Vanthachu!' : '🆕 New Arrivals are Here!',
          body: isTanglish
            ? '🚀 Super detailed printing specifications oda puthiya models available. Check out!'
            : '🚀 Discover our latest high-speed 3D printers and specialized filaments today!',
          emoji: '🆕',
          ctaText: 'Explore New'
        };
      case 'Festival Offer':
        return {
          title: festivalName 
            ? `🎉 Happy ${festivalName} Special!` 
            : '🎉 Festive Celebration Offers!',
          body: isTanglish
            ? `✨ Intha ${festivalName || 'festive season'} kondada unga favorite 3D models discount-la edunga!`
            : `✨ Elevate your creative projects this festive season with exclusive bundle discounts!`,
          emoji: '🎉',
          ctaText: 'Get Deals'
        };
      case 'Cart Reminder':
        return {
          title: isTanglish ? '🛒 Cart waiting-la iruku!' : '🛒 Forgot something?',
          body: isTanglish
            ? '⚠️ Unga cart-la selected items pending. Orders confirm panni special coupon edunga!'
            : '⚠️ Your cart is waiting! Complete your purchase now and enjoy fast shipping.',
          emoji: '🛒',
          ctaText: 'Checkout'
        };
      case 'Price Drop':
        return {
          title: isTanglish ? '📉 Price Kurunjiruchu!' : '📉 Price Drop Alert!',
          body: isTanglish
            ? '🤑 Unga wishlist item rate ippo romba kammi. Ippove order pannunga!'
            : '🤑 Your watched items just got cheaper! Grab them before they sell out.',
          emoji: '📉',
          ctaText: 'View Deal'
        };
      default:
        return {
          title: isTanglish ? '👋 Special Announcement!' : '👋 Big Update!',
          body: isTanglish
            ? '🔥 Namma store products update aayiduchu. Check the website for details.'
            : '🔥 We have exciting updates for you. Tap to explore our store announcements.',
          emoji: '👋',
          ctaText: 'Explore'
        };
    }
  };

  if (!apiKey) {
    console.warn('Gemini API key missing. Serving rule-based fallback content.');
    return getFallback();
  }

  try {
    const prompt = `
You are a conversion-focused marketing copywriter specializing in push notifications for a premium 3D printing B2B/B2C store (3D Galaxy Hub).
Generate a push notification copywriting copy based on these inputs:
- Campaign Type: ${campaignType}
- Tone: ${marketingTone} (e.g. Exciting, Urgent, Friendly, Professional)
- Language Mode: ${language} (Tanglish means Tamil written in English alphabet mixed with English words, highly colloquial and engaging, commonly used in South India marketing. English means standard persuasive English)
${festivalName ? `- Festival/Occasion: ${festivalName}` : ''}
${customInstructions ? `- Custom Admin Instructions: ${customInstructions}` : ''}

You MUST return a JSON object ONLY. Do not write any markdown wrappers (like \`\`\`json) or extra text.
The JSON structure MUST be exactly:
{
  "title": "A short engaging notification title (max 50 chars), starting with an emoji",
  "body": "A persuasive, conversion-focused message body (max 150 chars)",
  "emoji": "One or two relevant emojis to highlight the campaign",
  "ctaText": "Short CTA button text (max 15 chars)"
}
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      },
      {
        timeout: 8000
      }
    );

    const candidates = response?.data?.candidates;
    if (candidates && candidates.length > 0) {
      const text = candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text.trim());
      return {
        title: parsed.title || getFallback().title,
        body: parsed.body || getFallback().body,
        emoji: parsed.emoji || getFallback().emoji,
        ctaText: parsed.ctaText || getFallback().ctaText
      };
    }

    return getFallback();
  } catch (error) {
    console.error('Error during Gemini content generation:', error);
    return getFallback();
  }
};
