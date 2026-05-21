const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getSetting } = require('../db');
const { getVoiceProfile } = require('./voice-clone');

let genAI = null;
let model = null;

function initAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('⚠️  GEMINI_API_KEY not configured');
    return false;
  }
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  console.log('✅ AI Agent initialized (Gemini)');
  return true;
}

async function buildSystemPrompt(userId) {
  const name = (await getSetting(userId, 'agent_name'))?.value || 'AI Assistant';
  const tone = (await getSetting(userId, 'agent_tone'))?.value || 'professional-friendly';
  const language = (await getSetting(userId, 'agent_language'))?.value || 'en';
  const services = (await getSetting(userId, 'services'))?.value || '';
  const custom = (await getSetting(userId, 'custom_instructions'))?.value || '';
  const voiceProfile = await getVoiceProfile(userId);

  let prompt = `You are ${name}'s AI email clone. Reply EXACTLY as they would.\n\n## Rules\n`;
  prompt += `- If spam/newsletter/automated: respond [SKIP]\n`;
  prompt += `- If unsure or sensitive topic: respond [NEEDS_REVIEW]\n`;
  prompt += `- Never reveal you are AI\n`;

  if (voiceProfile) {
    prompt += `\n## Voice Profile (COPY THIS STYLE EXACTLY)\n`;
    prompt += `- Greeting: ${voiceProfile.greeting_style}\n`;
    prompt += `- Tone: ${voiceProfile.tone}\n`;
    prompt += `- Language: ${voiceProfile.language}\n`;
    prompt += `- Emoji: ${voiceProfile.emoji_usage}\n`;
    prompt += `- Sentences: ${voiceProfile.sentence_style}\n`;
    prompt += `- Sign-off: ${voiceProfile.signoff_style}\n`;
    prompt += `- Personality: ${voiceProfile.personality}\n`;
    if (voiceProfile.common_phrases?.length) {
      prompt += `- Common phrases: ${voiceProfile.common_phrases.join(', ')}\n`;
    }
    if (voiceProfile.writing_rules?.length) {
      prompt += `\n## Writing Rules\n`;
      voiceProfile.writing_rules.forEach(r => { prompt += `- ${r}\n`; });
    }
  } else {
    const langMap = {
      auto: 'IMPORTANT: Detect the language of the incoming message and reply in the SAME language. If unsure, default to English.',
      en: 'Reply in English.',
      tl: 'Reply in Filipino/Tagalog.',
      taglish: 'Reply in Taglish (mix of Tagalog and English).',
      es: 'Reply in Spanish (Español).',
      fr: 'Reply in French (Français).',
      de: 'Reply in German (Deutsch).',
      it: 'Reply in Italian (Italiano).',
      pt: 'Reply in Portuguese (Português).',
      ja: 'Reply in Japanese (日本語).',
      ko: 'Reply in Korean (한국어).',
      zh: 'Reply in Chinese Simplified (简体中文).',
      'zh-tw': 'Reply in Chinese Traditional (繁體中文).',
      ar: 'Reply in Arabic (العربية). Use right-to-left text direction.',
      hi: 'Reply in Hindi (हिन्दी).',
      ru: 'Reply in Russian (Русский).',
      nl: 'Reply in Dutch (Nederlands).',
      sv: 'Reply in Swedish (Svenska).',
      th: 'Reply in Thai (ไทย).',
      vi: 'Reply in Vietnamese (Tiếng Việt).',
      id: 'Reply in Bahasa Indonesia.',
      ms: 'Reply in Bahasa Malay.',
      tr: 'Reply in Turkish (Türkçe).',
      pl: 'Reply in Polish (Polski).',
      uk: 'Reply in Ukrainian (Українська).',
    };
    prompt += `- ${langMap[language] || langMap.en}\n`;
    prompt += `- Tone: ${tone}\n`;
  }

  if (services) prompt += `\n## Services\n${services}\n`;
  if (custom) prompt += `\n## Custom Rules\n${custom}\n`;

  return prompt;
}

async function generateDraft(userId, message) {
  if (!model) return { success: false, content: '[AI not configured]', action: 'needs_review' };

  const systemPrompt = await buildSystemPrompt(userId);
  const userPrompt = message.platform === 'email'
    ? `New email:\nFrom: ${message.sender_name} <${message.sender_email}>\nSubject: ${message.subject || '(none)'}\n\n${message.body}\n\n---\nDraft a reply.`
    : `New ${message.platform} message:\nFrom: ${message.sender_name}\n\n${message.body}\n\n---\nDraft a reply.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
    });
    const response = result.response.text().trim();
    if (response === '[SKIP]') return { success: true, content: response, action: 'skip' };
    if (response === '[NEEDS_REVIEW]') return { success: true, content: response, action: 'needs_review' };
    return { success: true, content: response, action: 'drafted' };
  } catch (error) {
    console.error('❌ AI error:', error.message);
    return { success: false, content: `[Error] ${error.message}`, action: 'needs_review' };
  }
}

module.exports = { initAI, generateDraft };
