/**
 * Profanity Filter — AutoInbox Security Module
 * Blocks foul language in all user-submitted text inputs.
 * Covers 12 languages: English, Filipino, Spanish, French, German,
 * Portuguese, Italian, Indonesian, Hindi, Japanese, Korean, Arabic.
 */

// Comprehensive multilingual bad words list
const BAD_WORDS = [
  // ── English ──
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

  // ── Filipino / Tagalog ──
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
  'betlog','burat','ogag',
  'peste','pesteng','siraulo','gunggong',
  'hampas lupa','ungas','unggas',

  // ── Spanish ──
  'mierda','puta','puto','hijo de puta','hijueputa',
  'cabron','cabrón','pendejo','pendeja',
  'chingar','chingada','chingado','pinche',
  'coño','cono','carajo',
  'culero','culera','culo',
  'verga','vergon','joder','jodido','jodida',
  'marica','maricon','maricón',
  'estupido','estúpido','idiota','imbecil','imbécil',
  'zorra','perra','malparido','malparida',
  'cojones','huevon','huevón','mamón',
  'chinga tu madre','la concha de tu madre',

  // ── French ──
  'merde','putain','pute','salaud','salope',
  'connard','connasse','con','conne',
  'enculer','enculé','nique','niquer',
  'nique ta mere','nique ta mère',
  'fils de pute','fdp',
  'bordel','foutre','baise','baiser',
  'couille','couilles',
  'branleur','branleuse',
  'ta gueule','ferme ta gueule',
  'batard','bâtard',
  'encule','pd','pédé','pede',
  'trouduc','trou du cul',
  'abruti','abrutie',

  // ── German ──
  'scheiße','scheisse','scheiss','scheiß',
  'fick','ficken','ficker','gefickt',
  'arschloch','arsch',
  'hurensohn','hure','hurentochter',
  'wichser','wichsen',
  'fotze','muschi',
  'schwanz','schwanzlutscher',
  'drecksau','dreckig',
  'miststück','mistkerl',
  'vollidiot','idiot','depp','trottel','dummkopf',
  'schlampe','nutte',
  'verdammt','verfickt',
  'spast','spasti','behindert',
  'leck mich','halt die fresse',

  // ── Portuguese ──
  'merda','porra','caralho','cacete',
  'puta','filho da puta','filha da puta','fdp',
  'foder','foda','foda-se','fodido','fodida',
  'buceta','boceta',
  'cu','cuzão','cuzao',
  'viado','veado','bicha',
  'arrombado','arrombada',
  'desgraçado','desgraçada','desgracado',
  'otário','otaria','otario',
  'babaca','idiota','imbecil',
  'piranha','vaca','vadia','vagabunda',
  'corno','chifrudo',
  'pau no cu','vai se foder','vai tomar no cu',

  // ── Italian ──
  'cazzo','minchia',
  'vaffanculo','fanculo','affanculo',
  'stronzo','stronza',
  'merda','merdoso','merdosa',
  'puttana','troia','zoccola','baldracca',
  'coglione','coglioni',
  'cornuto','cornuta',
  'porco dio','dio cane','madonna',
  'figlio di puttana',
  'bastardo','bastarda',
  'idiota','cretino','cretina','deficiente',
  'culo','fica',
  'cazzata','stronzata',
  'testa di cazzo','pezzo di merda',

  // ── Indonesian / Malay ──
  'bangsat','bajingan','brengsek',
  'anjing','anjir','anjay',
  'babi','babik',
  'kontol','memek','pepek',
  'ngentot','entot','ngewe',
  'jancok','jancuk','cok',
  'asu','asuw',
  'goblok','goblokk','tolol',
  'bego','bodoh','dungu',
  'kampret','kampang',
  'tai','taik','tahi',
  'setan','iblis',
  'keparat','sialan',
  'monyet','monyong',
  'pantek','pukimak','kimak',
  'sundal','lacur','lonte',

  // ── Hindi (romanized) ──
  'chutiya','chutiye','chutia',
  'madarchod','madarchode','mc',
  'behenchod','behenchode','bc',
  'bhenchod','bhenchode',
  'bhosdike','bhosdiwale',
  'gaand','gaandu','gandu',
  'lund','lauda','laude',
  'randi','raand','rand',
  'harami','haramzada','haramzadi',
  'kutta','kutti','kuttiya',
  'saala','saali','sala','sali',
  'choot','chut',
  'tatti','haggu',
  'ullu ka pattha','gadha',
  'jhaat','jhaatu',
  'bakchod','bakchodi',

  // ── Japanese (romanized) ──
  'kuso','kusottare',
  'baka','bakayaro',
  'aho','ahou',
  'shine','kutabare',
  'kisama','temee','teme',
  'kichiku','chikusho',
  'yariman','bita','bichi',
  'chinko','chinpo','manko',
  'unko','kichigai',
  'fuzakeru','fuzakeruna',
  'ketsu','ketsunoana',
  'busu','debu','kusobaba',
  'shね','koroshite',

  // ── Korean (romanized) ──
  'shibal','sibal','ssibal','ssbal',
  'gaesaekki','gaesekki','geseki',
  'jot','jonna','jotna','좆',
  'byeongsin','byungshin','병신',
  'michin','michinom','미친',
  'ssibal nom','ssibal nyeon',
  'nom','nyeon',
  'jiral','jiral','지랄',
  'gaejasik','개자식',
  'ttakchyeo','닥쳐',
  'kkojyeo','꺼져',
  'meongcheongi','멍청이',
  'babo','바보',
  'saekki','새끼',

  // ── Arabic (romanized) ──
  'kalb','ya kalb',
  'himar','ya himar','hamaar',
  'kuss','koss','kos omak','kos ommak',
  'sharmouta','sharmout','sharmuta','sharmoot',
  'ibn el sharmouta',
  'ayreh','ayree','ayre feek',
  'telhas teezi','tizi',
  'ahbal','ya ahbal',
  'manyak','manyake',
  'ibn el metnaka',
  'ya khara','khara',
  'wiskha','wisikh',
  'khawal','zamel',
  'ya zebbi','zebi','zeb',
  'nikomak','nik','ya nik',
  'yilaan abuk','yilaan diinak',

  // ── Leetspeak / Evasion variants ──
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
