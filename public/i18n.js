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
