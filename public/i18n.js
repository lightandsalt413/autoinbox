(function () {
  const SUPPORTED_LANGS = ['en', 'tl', 'ja'];
  const DEFAULT_LANG = 'en';
  const STORAGE_KEY = 'autoinbox_lang';
  const cache = {};

  function detectLanguage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGS.includes(stored)) return stored;

    const browserLang = (navigator.language || '').slice(0, 2).toLowerCase();
    if (SUPPORTED_LANGS.includes(browserLang)) return browserLang;

    return DEFAULT_LANG;
  }

  async function loadLanguage(langCode) {
    if (!SUPPORTED_LANGS.includes(langCode)) {
      console.warn(`[i18n] Unsupported language: ${langCode}. Falling back to ${DEFAULT_LANG}.`);
      langCode = DEFAULT_LANG;
    }
    if (cache[langCode]) {
      window.i18n.currentLang = langCode;
      return cache[langCode];
    }
    try {
      const res = await fetch(`/lang/${langCode}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cache[langCode] = data;
      window.i18n.currentLang = langCode;
      return data;
    } catch (err) {
      console.error(`[i18n] Failed to load language "${langCode}":`, err);
      if (langCode !== DEFAULT_LANG) return loadLanguage(DEFAULT_LANG);
      return {};
    }
  }

  function t(key) {
    const translations = cache[window.i18n.currentLang] || {};
    return translations[key] !== undefined ? translations[key] : key;
  }

  function applyTranslations() {
    const translations = cache[window.i18n.currentLang] || {};

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (translations[key] !== undefined) el.textContent = translations[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[key] !== undefined) el.placeholder = translations[key];
    });

    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      const key = el.getAttribute('data-i18n-html');
      if (translations[key] !== undefined) el.innerHTML = translations[key];
    });

    // Reposition fillet + canvas-header to match dynamic cutout-top-right width
    requestAnimationFrame(function () {
      var cutout = document.querySelector('.cutout-top-right');
      var fillet = document.querySelector('.fillet-tr-left');
      var canvas = document.querySelector('.landing-canvas');
      if (cutout && cutout.offsetParent) {
        cutout.style.removeProperty('width');
        var w = Math.round(cutout.getBoundingClientRect().width);
        cutout.style.setProperty('width', w + 'px', 'important');
        if (fillet) fillet.style.right = (w - 2) + 'px';
        if (canvas) canvas.style.setProperty('--cutout-right-w', w + 'px');
      }
    });

    // Kinetic Text Reveal wrapping for dynamic i18n titles
    (function() {
      var element = document.querySelector('.canvas-title');
      if (!element) return;
      var originalHTML = element.innerHTML;
      
      // Prevent double-wrapping
      if (element.querySelector('.word-wrap')) return;

      var lines = originalHTML.split('<br>');
      var newHTML = lines.map(function(line) {
        if (line.includes('class="hero-gradient-text"')) {
          return line.replace(/(<span[^>]*>.*?<\/span>)/g, '<span class="word-wrap"><span class="word hero-gradient-text">$1</span></span>');
        }
        var words = line.trim().split(/\s+/);
        return words.map(function(word) {
          if (!word) return '';
          return '<span class="word-wrap"><span class="word">' + word + '</span></span>';
        }).join(' ');
      }).join('<br>');
      
      element.innerHTML = newHTML;
      
      var words = element.querySelectorAll('.word');
      words.forEach(function(word, index) {
        word.style.animationDelay = (index * 0.08) + 's';
        word.classList.remove('animate');
        void word.offsetWidth; 
        word.classList.add('animate');
      });
    })();
  }

  async function switchTo(langCode) {
    await loadLanguage(langCode);
    localStorage.setItem(STORAGE_KEY, langCode);
    document.documentElement.lang = langCode;
    applyTranslations();
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: langCode } }));
  }

  async function init() {
    const lang = detectLanguage();
    await loadLanguage(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    applyTranslations();
  }

  window.i18n = {
    currentLang: DEFAULT_LANG,
    supportedLangs: SUPPORTED_LANGS,
    loadLanguage: loadLanguage,
    applyTranslations: applyTranslations,
    t: t,
    switchTo: switchTo,
    init: init
  };
})();
