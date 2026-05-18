const { getVoiceSamples, upsertSetting, getSetting } = require('../db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

function initVoiceAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') return false;
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  return true;
}

async function analyzeVoice(userId) {
  const samples = getVoiceSamples(userId);
  if (samples.length < 3) {
    return { success: false, error: 'Need at least 3 sample replies to analyze your style' };
  }

  if (!model) return { success: false, error: 'AI not configured' };

  const sampleTexts = samples.map((s, i) => `Sample ${i + 1}:\n${s.sample_text}`).join('\n\n');

  const prompt = `Analyze these message replies from the same person and create a detailed writing style profile. Focus on:

1. **Greeting style** - How do they start messages?
2. **Tone** - Formal, casual, friendly, professional?
3. **Language** - English, Tagalog, Taglish, mixed?
4. **Vocabulary** - Common words/phrases they use
5. **Emoji usage** - Do they use emojis? Which ones?
6. **Sentence structure** - Short/long, simple/complex?
7. **Sign-off style** - How do they end messages?
8. **Personality traits** - Helpful, direct, warm, etc.

Here are their sample replies:

${sampleTexts}

---
Respond with a JSON object (no markdown, just raw JSON) with this structure:
{
  "greeting_style": "description",
  "tone": "description",
  "language": "primary language used",
  "common_phrases": ["phrase1", "phrase2"],
  "emoji_usage": "description",
  "sentence_style": "description",
  "signoff_style": "description",
  "personality": "description",
  "writing_rules": ["rule1", "rule2", "rule3"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    // Clean potential markdown wrapping
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Validate JSON
    JSON.parse(cleaned);

    // Save profile
    upsertSetting(userId, 'voice_profile', cleaned);

    return { success: true, profile: JSON.parse(cleaned) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getVoiceProfile(userId) {
  const setting = getSetting(userId, 'voice_profile');
  if (!setting?.value) return null;
  try { return JSON.parse(setting.value); } catch (e) { return null; }
}

module.exports = { initVoiceAI, analyzeVoice, getVoiceProfile };
