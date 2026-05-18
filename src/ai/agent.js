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

function buildSystemPrompt(userId) {
  const name = getSetting(userId, 'agent_name')?.value || 'AI Assistant';
  const tone = getSetting(userId, 'agent_tone')?.value || 'professional-friendly';
  const language = getSetting(userId, 'agent_language')?.value || 'en';
  const services = getSetting(userId, 'services')?.value || '';
  const custom = getSetting(userId, 'custom_instructions')?.value || '';
  const voiceProfile = getVoiceProfile(userId);

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
    const langMap = { tl: 'Reply in Filipino/Tagalog.', taglish: 'Reply in Taglish.', en: 'Reply in English.' };
    prompt += `- ${langMap[language] || langMap.en}\n`;
    prompt += `- Tone: ${tone}\n`;
  }

  if (services) prompt += `\n## Services\n${services}\n`;
  if (custom) prompt += `\n## Custom Rules\n${custom}\n`;

  return prompt;
}

async function generateDraft(userId, message) {
  if (!model) return { success: false, content: '[AI not configured]', action: 'needs_review' };

  const systemPrompt = buildSystemPrompt(userId);
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
