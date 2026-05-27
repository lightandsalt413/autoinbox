/**
 * Profanity Filter — AutoInbox Security Module
 * Blocks foul language in all user-submitted text inputs.
 * Covers English, Filipino/Tagalog, and common leetspeak variations.
 */

// Comprehensive bad words list (English + Filipino/Tagalog + common variants)
const BAD_WORDS = [
  // English profanity
  'fuck','fucker','fucking','fucked','fucks','fck','fcking','fcked','fuk','fukin',
  'shit','shitty','shitting','bullshit','shite','sht',
  'ass','asshole','assholes','arse','arsehole',
  'bitch','bitches','bitching','bitchy',
  'damn','dammit','goddamn','goddammit',
  'dick','dicks','dickhead',
  'cock','cocks','cocksucker',
  'cunt','cunts',
  'bastard','bastards',
  'whore','whores',
  'slut','sluts','slutty',
  'piss','pissed','pissing',
  'crap','crappy',
  'douche','douchebag',
  'wanker','wankers',
  'twat','twats',
  'motherfucker','motherfucking','mofo','mf',
  'nigger','nigga','niggas',
  'retard','retarded',
  'faggot','fag','fags',

  // Filipino/Tagalog profanity
  'putangina','putang ina','puta','tangina','tanginamo','tanginang',
  'gago','gaga','gagong',
  'bobo','tanga','ulol','inutil',
  'tarantado','tarantada',
  'hayop','hayop ka',
  'leche','lintik','punyeta','punyetang',
  'kingina','kinginamo',
  'pakyu','pakshet','paksheet',
  'bwisit','bwiset',
  'kupal',
  'hindot','hindutan','kantot','kantutan','jakol',
  'tite','titi','pepe','pekpek',
  'betlog',
  'burat',
  'ogag',
  'peste','pesteng',
  'siraulo',
  'gunggong',
  'hampas lupa',
  'ungas','unggas',

  // Leetspeak / evasion variants
  'f*ck','f**k','s**t','sh*t','a**','b*tch','d*ck','c*nt',
  'f u c k','s h i t','b i t c h',
  'phuck','phuk','fux','biatch','beyotch','biotch',
  'azz','a$$','@ss','@sshole',
  'p*ta','t*ngina','g*go',
];

// Build regex patterns from the word list for efficient matching
const patterns = BAD_WORDS.map(word => {
  // Escape special regex characters
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Allow optional spaces/dots/dashes between characters for evasion detection
  return escaped;
});

// Create a single combined regex (case-insensitive, word boundary where possible)
const profanityRegex = new RegExp(
  patterns.map(p => {
    // For multi-word patterns, don't add word boundaries
    if (p.includes(' ') || p.includes('\\*') || p.includes('\\$') || p.includes('@')) {
      return `(${p})`;
    }
    return `\\b(${p})\\b`;
  }).join('|'),
  'gi'
);

/**
 * Check if text contains profanity
 * @param {string} text - Text to check
 * @returns {{ hasProfanity: boolean, matches: string[] }}
 */
function checkProfanity(text) {
  if (!text || typeof text !== 'string') return { hasProfanity: false, matches: [] };

  const normalized = text
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a');

  const matches = [];

  // Check original text
  const originalMatches = text.match(profanityRegex);
  if (originalMatches) matches.push(...originalMatches);

  // Check normalized text (leetspeak decoded)
  const normalizedMatches = normalized.match(profanityRegex);
  if (normalizedMatches) matches.push(...normalizedMatches);

  // Deduplicate
  const unique = [...new Set(matches.map(m => m.toLowerCase()))];

  return {
    hasProfanity: unique.length > 0,
    matches: unique
  };
}

/**
 * Check multiple fields for profanity
 * @param {Object} fields - Key-value pairs of field names and their values
 * @returns {{ clean: boolean, violations: { field: string, matches: string[] }[] }}
 */
function checkFields(fields) {
  const violations = [];

  for (const [field, value] of Object.entries(fields)) {
    if (!value || typeof value !== 'string') continue;
    const result = checkProfanity(value);
    if (result.hasProfanity) {
      violations.push({ field, matches: result.matches });
    }
  }

  return {
    clean: violations.length === 0,
    violations
  };
}

/**
 * Express middleware to block profanity in request body
 * Checks all string values in req.body
 */
function profanityMiddleware(req, res, next) {
  if (!req.body || typeof req.body !== 'object') return next();

  const fieldsToCheck = {};

  // Recursively extract string values from body
  function extractStrings(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        // Skip password fields and email fields
        if (key.toLowerCase().includes('password') || key.toLowerCase().includes('pass') || key === 'email' || key === 'email_address' || key === 'email_password') continue;
        fieldsToCheck[fieldName] = value;
      } else if (Array.isArray(value)) {
        value.forEach((item, i) => {
          if (typeof item === 'string') {
            fieldsToCheck[`${fieldName}[${i}]`] = item;
          }
        });
      }
    }
  }

  extractStrings(req.body);

  const result = checkFields(fieldsToCheck);

  if (!result.clean) {
    const fieldNames = result.violations.map(v => v.field).join(', ');
    return res.status(400).json({
      error: 'Inappropriate language detected. Please remove offensive words and try again.',
      details: `Violation found in: ${fieldNames}`
    });
  }

  next();
}

module.exports = { checkProfanity, checkFields, profanityMiddleware };
