// ===== State =====
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// ===== reCAPTCHA v3 Helper =====
const RECAPTCHA_SITE_KEY = '6Lee4Q8tAAAAAGbVxUjhaAZS8FTz_HD9aTsa1QYi';
async function getRecaptchaToken(action) {
  try {
    if (typeof grecaptcha === 'undefined') return null;
    return await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
  } catch (e) {
    console.warn('reCAPTCHA failed:', e);
    return null;
  }
}

// ===== Profanity Filter (Client-Side — 12 Languages) =====
const _profanityWords = [
  // English
  'fuck','fucker','fucking','fucked','fck','fcking','fuk','fukin',
  'shit','shitty','bullshit','sht',
  'asshole','assholes','arsehole',
  'bitch','bitches','bitchy',
  'dick','dickhead','cock','cocksucker',
  'cunt','cunts','bastard','bastards',
  'whore','whores','slut','sluts',
  'motherfucker','motherfucking','mofo',
  'nigger','nigga','retard','retarded','faggot','fag',
  // Filipino/Tagalog
  'putangina','putang ina','puta','tangina','tanginamo',
  'gago','gaga','gagong','bobo','tanga','ulol','inutil',
  'tarantado','tarantada','leche','lintik','punyeta',
  'kingina','kinginamo','pakyu','pakshet',
  'kupal','hindot','kantot','jakol',
  'tite','titi','pekpek','betlog','burat','ogag',
  'siraulo','gunggong','ungas',
  // Spanish
  'mierda','puto','hijo de puta','hijueputa',
  'cabron','cabrón','pendejo','pendeja',
  'chingar','chingada','chingado','pinche',
  'coño','cono','carajo','culero','culo',
  'verga','joder','jodido','jodida',
  'marica','maricon','maricón',
  'zorra','perra','malparido','cojones',
  'chinga tu madre',
  // French
  'merde','putain','pute','salaud','salope',
  'connard','connasse','enculer','enculé',
  'nique','niquer','nique ta mere',
  'fils de pute','fdp','bordel','foutre',
  'baise','baiser','branleur','branleuse',
  'ta gueule','batard','bâtard','trou du cul',
  // German
  'scheiße','scheisse','scheiss',
  'fick','ficken','ficker','gefickt',
  'arschloch','arsch','hurensohn','hure',
  'wichser','wichsen','fotze','muschi',
  'schwanz','drecksau','schlampe','nutte',
  'verdammt','verfickt','spasti','halt die fresse',
  // Portuguese
  'merda','porra','caralho','cacete',
  'filho da puta','filha da puta',
  'foder','foda','fodido','fodida',
  'buceta','boceta','cuzão','cuzao',
  'arrombado','arrombada','desgraçado',
  'otário','otario','babaca','vadia','vagabunda',
  'vai se foder','vai tomar no cu',
  // Italian
  'cazzo','minchia','vaffanculo','fanculo',
  'stronzo','stronza','merdoso','merdosa',
  'puttana','troia','zoccola',
  'coglione','coglioni','cornuto','cornuta',
  'porco dio','dio cane','figlio di puttana',
  'testa di cazzo','pezzo di merda',
  // Indonesian/Malay
  'bangsat','bajingan','brengsek',
  'anjing','anjir','anjay','babi',
  'kontol','memek','pepek','ngentot','ngewe',
  'jancok','jancuk','goblok','tolol',
  'bego','bodoh','dungu','kampret',
  'keparat','sialan','pukimak','kimak','sundal','lonte',
  // Hindi (romanized)
  'chutiya','chutiye','madarchod','madarchode',
  'behenchod','behenchode','bhenchod',
  'bhosdike','gaand','gaandu','gandu',
  'lund','lauda','laude','randi','raand',
  'harami','haramzada','haramzadi',
  'kutta','kutti','saala','saali',
  'choot','chut','bakchod','bakchodi',
  // Japanese (romanized)
  'kuso','kusottare','baka','bakayaro',
  'kisama','temee','teme','chikusho',
  'chinko','chinpo','manko','kichigai',
  'ketsunoana','kusobaba',
  // Korean (romanized)
  'shibal','sibal','ssibal','ssbal',
  'gaesaekki','gaesekki','geseki',
  'byeongsin','byungshin','michin','michinom',
  'ssibal nom','ssibal nyeon','saekki',
  // Arabic (romanized)
  'kalb','ya kalb','himar','ya himar',
  'kuss','koss','kos omak','kos ommak',
  'sharmouta','sharmout','sharmuta','sharmoot',
  'ibn el sharmouta','ayreh','ayree',
  'ya khara','khara','khawal','zamel',
  'nikomak','yilaan abuk',
  // Leetspeak
  'phuck','phuk','biatch','beyotch','biotch'
];
const _profanityRegex = new RegExp(
  _profanityWords.map(w => {
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return w.includes(' ') ? `(${esc})` : `\\b(${esc})\\b`;
  }).join('|'), 'gi'
);
function hasProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  const norm = text.toLowerCase()
    .replace(/0/g,'o').replace(/1/g,'i').replace(/3/g,'e')
    .replace(/4/g,'a').replace(/5/g,'s').replace(/\$/g,'s').replace(/@/g,'a');
  return _profanityRegex.test(text) || _profanityRegex.test(norm);
}
function checkFormProfanity(...values) {
  for (const v of values) {
    if (hasProfanity(v)) return true;
  }
  return false;
}
let token = localStorage.getItem('kk_token') || sessionStorage.getItem('kk_token') || '';
let currentFilter = 'all';
let currentMsgId = null;
let refreshTimer = null;

// ===== Currency Detection =====
const isPH = (() => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = (navigator.language || '').toLowerCase();
    return tz.includes('Manila') || lang.startsWith('fil') || lang === 'tl';
  } catch (e) { return false; }
})();
const CURRENCY = {
  symbol: isPH ? '₱' : '$',
  basic: isPH ? '₱499' : '$9',
  pro: isPH ? '₱999' : '$19',
  free: isPH ? '₱0' : '$0',
  basicFull: isPH ? '₱499/mo' : '$9/mo',
  proFull: isPH ? '₱999/mo' : '$19/mo',
  freeFull: isPH ? '₱0/mo' : '$0/mo'
};

// ===== Navigation Configurations =====
const MODAL_HASHES = {
  'features-modal': 'features',
  'languages-modal': 'languages',
  'how-modal': 'how-it-works',
  'guide-modal': 'setup-guide',
  'pricing-modal': 'pricing',
  'faq-modal': 'faq',
  'feedback-modal': 'feedback'
};

const HASH_TO_MODAL = {
  'features': 'features-modal',
  'languages': 'languages-modal',
  'how-it-works': 'how-modal',
  'setup-guide': 'guide-modal',
  'pricing': 'pricing-modal',
  'faq': 'faq-modal',
  'feedback': 'feedback-modal'
};

const MODAL_MAPPING = {
  'menu-features': 'features-modal',
  'menu-how': 'how-modal',
  'menu-guide': 'guide-modal',
  'menu-pricing': 'pricing-modal',
  'menu-faq': 'faq-modal',
  'menu-feedback': 'feedback-modal'
};

const modalCloseConfig = [
  { id: 'features-modal', closeBtn: 'features-modal-close', bg: 'features-modal-bg' },
  { id: 'languages-modal', closeBtn: 'languages-modal-close', bg: 'languages-modal-bg' },
  { id: 'how-modal', closeBtn: 'how-modal-close', bg: 'how-modal-bg' },
  { id: 'pricing-modal', closeBtn: 'pricing-modal-close', bg: 'pricing-modal-bg' },
  { id: 'faq-modal', closeBtn: 'faq-modal-close', bg: 'faq-modal-bg' },
  { id: 'feedback-modal', closeBtn: 'feedback-modal-close', bg: 'feedback-modal-bg' }
];

// ===== Page Loading Bar =====
let apiPending = 0;
function showLoader() {
  apiPending++;
  const el = document.getElementById('page-loader');
  if (el) { el.className = 'active'; }
}
function hideLoader() {
  apiPending = Math.max(0, apiPending - 1);
  if (apiPending === 0) {
    const el = document.getElementById('page-loader');
    if (el) { el.className = 'done'; setTimeout(() => { el.className = ''; }, 500); }
  }
}

// ===== Button Loading Spinner =====
function btnLoading(btn, isDark = false) {
  if (!btn) return;
  btn._origText = btn.textContent;
  btn.classList.add('btn-loading');
  if (isDark) btn.classList.add('btn-loading-dark');
  btn.disabled = true;
}
function btnDone(btn) {
  if (!btn) return;
  btn.classList.remove('btn-loading', 'btn-loading-dark');
  btn.disabled = false;
  if (btn._origText) btn.textContent = btn._origText;
}

// ===== API =====
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  showLoader();
  try {
    const res = await fetch(`/api${path}`, { ...opts, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } finally {
    hideLoader();
  }
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

// ===== Language Switcher UI Helper =====
const LANG_META = {
  en: { flag: '🇺🇸', label: 'English' },
  tl: { flag: '🇵🇭', label: 'Filipino' },
  ja: { flag: '🇯🇵', label: '日本語' }
};
function updateLangSwitcherUI(langCode) {
  const meta = LANG_META[langCode] || LANG_META.en;
  const flagEl = document.getElementById('nav-lang-flag');
  const labelEl = document.getElementById('nav-lang-label');
  if (flagEl) flagEl.textContent = meta.flag;
  if (labelEl) {
    labelEl.textContent = meta.label;
    // Update the data-i18n key so applyTranslations() doesn't overwrite
    labelEl.setAttribute('data-i18n', 'lang_switch_' + langCode);
  }

  // Update active state in dropdown
  document.querySelectorAll('.lang-switcher-option').forEach(opt => {
    opt.classList.toggle('active', opt.getAttribute('data-lang') === langCode);
  });
}

// ===== Auto-update prices based on location =====
document.addEventListener('DOMContentLoaded', () => {
  // Update all price-val elements on landing page
  document.querySelectorAll('.price-val').forEach(el => {
    const text = el.innerHTML;
    if (text.includes('₱0')) el.innerHTML = text.replace('₱0', CURRENCY.free);
    else if (text.includes('₱499')) el.innerHTML = text.replace('₱499', CURRENCY.basic);
    else if (text.includes('₱999')) el.innerHTML = text.replace('₱999', CURRENCY.pro);
  });
  // Update dashboard plan option prices
  document.querySelectorAll('.po-price').forEach(el => {
    const text = el.innerHTML;
    if (text.includes('₱0')) el.innerHTML = text.replace('₱0', CURRENCY.free);
    else if (text.includes('₱499')) el.innerHTML = text.replace('₱499', CURRENCY.basic);
    else if (text.includes('₱999')) el.innerHTML = text.replace('₱999', CURRENCY.pro);
  });
  // Initialize multi-language playground
  initDemoPlayground();

  // ===== i18n Initialization =====
  if (window.i18n) {
    window.i18n.init().then(() => {
      // Update language switcher UI to match current language
      updateLangSwitcherUI(window.i18n.currentLang);
    });
  }

  // Reposition fillet + canvas-header on resize
  window.addEventListener('resize', function () {
    var cutout = document.querySelector('.cutout-top-right');
    var canvas = document.querySelector('.landing-canvas');
    if (cutout && cutout.offsetParent) {
      cutout.style.removeProperty('width');
      var w = Math.round(cutout.getBoundingClientRect().width);
      cutout.style.setProperty('width', w + 'px', 'important');
      if (canvas) canvas.style.setProperty('--cutout-right-w', w + 'px');
    }
  });

  // ===== Language Switcher =====
  const langSwitcherBtn = document.getElementById('lang-switcher-btn');
  const langSwitcherDropdown = document.getElementById('lang-switcher-dropdown');

  if (langSwitcherBtn && langSwitcherDropdown) {
    // Toggle dropdown
    langSwitcherBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      langSwitcherDropdown.classList.toggle('open');
    });

    // Language option clicks
    langSwitcherDropdown.querySelectorAll('.lang-switcher-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = opt.getAttribute('data-lang');
        if (window.i18n && lang) {
          window.i18n.switchTo(lang);
          updateLangSwitcherUI(lang);
        }
        langSwitcherDropdown.classList.remove('open');
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!langSwitcherBtn.contains(e.target) && !langSwitcherDropdown.contains(e.target)) {
        langSwitcherDropdown.classList.remove('open');
      }
    });
  }


  // Hero CTA Contact Us button
  document.getElementById('btn-hero-contact')?.addEventListener('click', () => {
    openModal('feedback-modal');
  });
});

// ===== Navigation =====
let currentPage = null;
function showPage(id, addHistory = true) {
  // Trigger top-loading bar sweep on page change
  showLoader();
  setTimeout(hideLoader, 250);

  closeLandingModals();
  closeGuideModal();
  if (id === 'login') {
    const rememberedEmail = localStorage.getItem('autoinbox_remembered_email');
    const emailInput = document.getElementById('login-email');
    if (rememberedEmail && emailInput) {
      emailInput.value = rememberedEmail;
      const rememberCheckbox = document.getElementById('remember-me');
      if (rememberCheckbox) rememberCheckbox.checked = true;
    }
  }

  // Manage scroll progress bar visibility
  const scrollBar = document.getElementById('scroll-progress-bar');
  if (scrollBar) {
    if (id === 'landing') {
      scrollBar.classList.add('visible');
    } else {
      scrollBar.classList.remove('visible');
      scrollBar.style.width = '0%';
    }
  }
  document.querySelectorAll('.page').forEach(p => {
    if (p.id === 'page-landing' && (id === 'login' || id === 'register' || id === 'forgot-pass')) {
      p.classList.remove('hidden');
    } else if (p.id === `page-${id}`) {
      p.classList.remove('hidden');
    } else {
      p.classList.add('hidden');
    }
  });
  const landing = document.getElementById('page-landing');
  if (landing) {
    if (id === 'login' || id === 'register' || id === 'forgot-pass') {
      landing.classList.add('auth-blur');
    } else {
      landing.classList.remove('auth-blur');
    }
  }
  if (addHistory && id !== 'landing') {
    if (currentPage === id) {
      history.replaceState({ page: id }, '', `#${id}`);
    } else {
      history.pushState({ page: id }, '', `#${id}`);
    }
  } else if (addHistory && id === 'landing') {
    // If there was a modal or auth hash, keep it clean
    const currentHash = window.location.hash.replace('#', '');
    const authPages = ['login', 'register', 'forgot-pass'];
    if (HASH_TO_MODAL[currentHash] || authPages.includes(currentHash) || !currentHash) {
      history.replaceState(null, '', window.location.pathname);
    }
  }
  currentPage = id;
  window.scrollTo({ top: 0 });
  if (id === 'landing' && typeof checkRevealFallback === 'function') {
    setTimeout(checkRevealFallback, 100);
  }
  // Re-apply translations for newly-visible page content
  if (window.i18n) window.i18n.applyTranslations();
}

// Back button / Navigation popstate handler
window.addEventListener('popstate', (e) => {
  // Always close all modals on history navigation (popstate)
  closeLandingModals();
  closeGuideModal();

  // Close menu panel without changing history state
  if (menuPanel) {
    menuPanel.classList.remove('open');
  }

  if (e.state) {
    if (e.state.page) {
      showPage(e.state.page, false);
    }
    if (e.state.modal) {
      openModal(e.state.modal, false, e.state.extra);
    }
  } else {
    // Check if the hash matches a modal
    const hash = window.location.hash.replace('#', '');
    const modalId = HASH_TO_MODAL[hash];
    if (modalId) {
      openModal(modalId, false);
    } else {
      showPage('landing', false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
});

function showDashSection(id) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`dash-${id}`).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.mnav-item').forEach(m => m.classList.remove('active'));
  
  const sidebarBtn = document.querySelector(`.sidebar [data-page="${id}"]`);
  if (sidebarBtn) sidebarBtn.classList.add('active');
  
  const mobileBtn = document.querySelector(`.mobile-nav [data-page="${id}"]`);
  if (mobileBtn) mobileBtn.classList.add('active');
}

// ===== Auth =====
document.getElementById('btn-goto-login')?.addEventListener('click', () => showPage('login'));
document.getElementById('btn-goto-register')?.addEventListener('click', () => showPage('register'));
document.getElementById('btn-hero-start')?.addEventListener('click', () => showPage('register'));
document.getElementById('btn-how-signup')?.addEventListener('click', () => showPage('register'));
document.getElementById('link-register')?.addEventListener('click', (e) => { e.preventDefault(); showPage('register'); });
document.getElementById('link-login')?.addEventListener('click', (e) => { e.preventDefault(); showPage('login'); });
document.getElementById('login-goto-register')?.addEventListener('click', () => showPage('register'));
document.getElementById('register-goto-login')?.addEventListener('click', () => showPage('login'));
document.getElementById('mah-goto-register')?.addEventListener('click', () => showPage('register'));
document.getElementById('maf-goto-login')?.addEventListener('click', () => showPage('login'));
document.getElementById('login-modal-close')?.addEventListener('click', () => showPage('landing'));
document.getElementById('login-modal-bg')?.addEventListener('click', () => showPage('landing'));
document.getElementById('page-login')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) showPage('landing'); });
document.getElementById('register-modal-close')?.addEventListener('click', () => showPage('landing'));
document.getElementById('register-modal-bg')?.addEventListener('click', () => showPage('landing'));
document.getElementById('page-register')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) showPage('landing'); });
document.getElementById('logo-home')?.addEventListener('click', (e) => { e.preventDefault(); showPage('landing'); window.scrollTo({top:0,behavior:'smooth'}); });
document.getElementById('login-back-home')?.addEventListener('click', (e) => { e.preventDefault(); showPage('landing'); window.scrollTo({top:0,behavior:'smooth'}); });
document.getElementById('register-back-home')?.addEventListener('click', (e) => { e.preventDefault(); showPage('landing'); window.scrollTo({top:0,behavior:'smooth'}); });

// ===== Forgot Password Navigation & Logic =====
document.getElementById('link-forgot-pass')?.addEventListener('click', (e) => {
  e.preventDefault();
  resetForgotModal();
  showPage('forgot-pass');
});

document.getElementById('forgot-modal-close')?.addEventListener('click', () => showPage('login'));
document.getElementById('forgot-modal-bg')?.addEventListener('click', () => showPage('login'));
document.getElementById('link-forgot-back-login')?.addEventListener('click', (e) => {
  e.preventDefault();
  showPage('login');
});

document.getElementById('link-forgot-back-step-1')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('forgot-step-2').classList.add('hidden');
  document.getElementById('forgot-step-1').classList.remove('hidden');
});

// Helper to reset the Forgot Password form states
function resetForgotModal() {
  document.getElementById('forgot-step-1')?.classList.remove('hidden');
  document.getElementById('forgot-step-2')?.classList.add('hidden');
  
  const emailInput = document.getElementById('forgot-email');
  if (emailInput) emailInput.value = '';
  
  const codeInput = document.getElementById('forgot-code');
  if (codeInput) codeInput.value = '';
  
  const newPassInput = document.getElementById('forgot-new-pass');
  if (newPassInput) newPassInput.value = '';
  
  const confirmPassInput = document.getElementById('forgot-confirm-pass');
  if (confirmPassInput) confirmPassInput.value = '';
  
  document.getElementById('forgot-error-1')?.classList.add('hidden');
  document.getElementById('forgot-error-2')?.classList.add('hidden');
  
  const sendBtn = document.getElementById('btn-forgot-send');
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.innerText = 'Send Reset Code';
  }
  const resetBtn = document.getElementById('btn-forgot-reset');
  if (resetBtn) {
    resetBtn.disabled = false;
    resetBtn.innerText = 'Reset Password';
  }
}

// Step 1: Send reset code request
document.getElementById('form-forgot-request')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const emailVal = document.getElementById('forgot-email')?.value?.trim();
  const errorDiv = document.getElementById('forgot-error-1');
  const sendBtn = document.getElementById('btn-forgot-send');
  
  if (!emailVal) return;
  if (errorDiv) errorDiv.classList.add('hidden');
  
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerText = 'Sending Code...';
  }
  
  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailVal })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send reset code');
    }
    
    // If SMTP/SMS is not configured, show code directly on the screen for local development fallback
    if (data.fallbackCode) {
      alert(`[Dev Mode] Verification code generated: ${data.fallbackCode}\n(This will be sent to the client's email or cellphone in production!)`);
    } else {
      alert('A 6-digit verification code has been sent to your email or cellphone number!');
    }
    
    // Slide/transition to Step 2
    document.getElementById('forgot-step-1')?.classList.add('hidden');
    document.getElementById('forgot-step-2')?.classList.remove('hidden');
  } catch (err) {
    if (errorDiv) {
      errorDiv.innerText = err.message;
      errorDiv.classList.remove('hidden');
    }
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerText = 'Send Reset Code';
    }
  }
});

// Step 2: Reset password
document.getElementById('form-forgot-reset')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const emailVal = document.getElementById('forgot-email')?.value?.trim();
  const codeVal = document.getElementById('forgot-code')?.value?.trim();
  const newPassVal = document.getElementById('forgot-new-pass')?.value;
  const confirmPassVal = document.getElementById('forgot-confirm-pass')?.value;
  
  const errorDiv = document.getElementById('forgot-error-2');
  const resetBtn = document.getElementById('btn-forgot-reset');
  
  if (!emailVal || !codeVal || !newPassVal || !confirmPassVal) return;
  if (errorDiv) errorDiv.classList.add('hidden');
  
  if (newPassVal !== confirmPassVal) {
    if (errorDiv) {
      errorDiv.innerText = 'Passwords do not match.';
      errorDiv.classList.remove('hidden');
    }
    return;
  }
  
  if (newPassVal.length < 6) {
    if (errorDiv) {
      errorDiv.innerText = 'Password must be at least 6 characters.';
      errorDiv.classList.remove('hidden');
    }
    return;
  }
  
  if (resetBtn) {
    resetBtn.disabled = true;
    resetBtn.innerText = 'Resetting Password...';
  }
  
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailVal,
        code: codeVal,
        newPassword: newPassVal
      })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset password');
    }
    
    alert('Password updated successfully! You can now log in with your new password.');
    
    // Redirect back to login modal
    resetForgotModal();
    showPage('login');
  } catch (err) {
    if (errorDiv) {
      errorDiv.innerText = err.message;
      errorDiv.classList.remove('hidden');
    }
    if (resetBtn) {
      resetBtn.disabled = false;
      resetBtn.innerText = 'Reset Password';
    }
  }
});

// ===== Menu Dropdown =====
const menuTrigger = document.getElementById('menu-trigger');
const menuPanel = document.getElementById('menu-panel');

function openMenu() {
  if (menuPanel && !menuPanel.classList.contains('open')) {
    menuPanel.classList.add('open');
    history.pushState({ page: currentPage, menuOpen: true }, '', '#menu');
  }
}

function closeMenu(goBack = true) {
  if (menuPanel && menuPanel.classList.contains('open')) {
    menuPanel.classList.remove('open');
    if (goBack && history.state && history.state.menuOpen) {
      history.back();
    }
  }
}

menuTrigger?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (menuPanel) {
    if (menuPanel.classList.contains('open')) {
      closeMenu(true);
    } else {
      openMenu();
    }
  }
});

// Close menu if clicking outside
document.addEventListener('click', (e) => {
  if (menuPanel && menuPanel.classList.contains('open') && !menuPanel.contains(e.target) && e.target !== menuTrigger) {
    closeMenu(true);
  }
});

function closeLandingModals() {
  document.getElementById('features-modal')?.classList.add('hidden');
  document.getElementById('languages-modal')?.classList.add('hidden');
  document.getElementById('how-modal')?.classList.add('hidden');
  document.getElementById('pricing-modal')?.classList.add('hidden');
  document.getElementById('faq-modal')?.classList.add('hidden');
  document.getElementById('feedback-modal')?.classList.add('hidden');
  document.getElementById('guide-modal')?.classList.add('hidden');
  stopDemoCycle();
}

// MODAL_HASHES and HASH_TO_MODAL moved to top to prevent temporal dead zone (TDZ) errors

function openModal(modalId, addHistory = true, extra = null) {
  const el = document.getElementById(modalId);
  if (!el) return;

  if (modalId === 'guide-modal') {
    el.classList.remove('hidden');
    const provider = extra || 'gmail';
    const targetTab = document.querySelector(`#modal-guide-tabs .tab[data-provider="${provider}"]`);
    if (targetTab) {
      targetTab.click();
    }
  } else {
    closeLandingModals();
    el.classList.remove('hidden');
    if (modalId === 'languages-modal') {
      startDemoCycle();
    }
  }

  // Re-apply translations for newly-visible modal content
  if (window.i18n) window.i18n.applyTranslations();

  if (addHistory) {
    const hash = MODAL_HASHES[modalId];
    if (hash) {
      history.pushState({ page: currentPage, modal: modalId, extra: extra }, '', '#' + hash);
    }
  }
}

function closeModal(modalId) {
  if (history.state && history.state.modal === modalId) {
    history.back();
  } else {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.add('hidden');
      if (modalId === 'languages-modal') {
        stopDemoCycle();
      }
    }
    // Clean up URL hash if matches this modal
    const hash = MODAL_HASHES[modalId];
    if (window.location.hash.replace('#', '') === hash) {
      history.replaceState({ page: currentPage }, '', window.location.pathname);
    }
  }
}

// MODAL_MAPPING moved to top

const MENU_TO_SECTION = {
  'menu-features': 'features',
  'menu-how': 'how',
  'menu-pricing': 'pricing',
  'menu-faq': 'faq',
  'menu-feedback': 'feedback'
};

document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Smooth scroll if on landing page and section exists
    const id = item.id;
    const sectionId = MENU_TO_SECTION[id];
    if (currentPage === 'page-landing' && sectionId) {
      const element = document.getElementById(sectionId);
      if (element) {
        const container = document.querySelector('.landing-canvas');
        if (container) {
          if (menuPanel) {
            menuPanel.classList.remove('open');
          }
          container.scrollTo({
            top: element.offsetTop - 80,
            behavior: 'smooth'
          });
          return;
        }
      }
    }

    const inMenuState = history.state && history.state.menuOpen;
    if (menuPanel) {
      menuPanel.classList.remove('open');
    }
    const modalId = MODAL_MAPPING[id];
    if (modalId) {
      if (modalId === 'guide-modal') {
        if (inMenuState) {
          const hash = MODAL_HASHES[modalId];
          history.replaceState({ page: currentPage, modal: modalId, extra: 'gmail' }, '', '#' + hash);
          openModal(modalId, false, 'gmail');
        } else {
          openGuideModal('gmail');
        }
      } else {
        if (inMenuState) {
          const hash = MODAL_HASHES[modalId];
          history.replaceState({ page: currentPage, modal: modalId }, '', '#' + hash);
          openModal(modalId, false);
        } else {
          openModal(modalId, true);
        }
      }
    }
  });
});

// Close all modal handlers for landing page
// modalCloseConfig moved to top

modalCloseConfig.forEach(m => {
  const btnEl = document.getElementById(m.closeBtn);
  const bgEl = document.getElementById(m.bg);
  btnEl?.addEventListener('click', () => closeModal(m.id));
  bgEl?.addEventListener('click', () => closeModal(m.id));
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu-dropdown')) {
    menuPanel?.classList.remove('open');
  }
});

// ===== Setup Guide Logic =====

// Landing Page Setup Guide Tabs Switcher
document.querySelectorAll('#lp-guide-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const provider = tab.getAttribute('data-provider');
    document.querySelectorAll('#lp-guide-tabs .tab').forEach(t => t.classList.toggle('active', t === tab));
    
    if (provider === 'yahoo') {
      document.getElementById('lp-guide-gmail')?.classList.add('hidden');
      document.getElementById('lp-guide-yahoo')?.classList.remove('hidden');
    } else {
      document.getElementById('lp-guide-yahoo')?.classList.add('hidden');
      document.getElementById('lp-guide-gmail')?.classList.remove('hidden');
    }
  });
});

// Modal Setup Guide Tabs Switcher
document.querySelectorAll('#modal-guide-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const provider = tab.getAttribute('data-provider');
    document.querySelectorAll('#modal-guide-tabs .tab').forEach(t => t.classList.toggle('active', t === tab));
    
    if (provider === 'yahoo') {
      document.getElementById('modal-guide-gmail')?.classList.add('hidden');
      document.getElementById('modal-guide-yahoo')?.classList.remove('hidden');
    } else {
      document.getElementById('modal-guide-yahoo')?.classList.add('hidden');
      document.getElementById('modal-guide-gmail')?.classList.remove('hidden');
    }
  });
});

// Open Setup Guide Modal (Onboarding & Settings)
function openGuideModal(provider) {
  openModal('guide-modal', true, provider);
}

document.getElementById('ob-open-guide')?.addEventListener('click', (e) => {
  e.preventDefault();
  const activeObTab = document.querySelector('#ob-provider-tabs .tab.active');
  const provider = activeObTab ? activeObTab.getAttribute('data-provider') : 'gmail';
  openGuideModal(provider);
});

document.getElementById('set-open-guide')?.addEventListener('click', (e) => {
  e.preventDefault();
  const activeSetTab = document.querySelector('#set-provider-tabs .tab.active');
  const provider = activeSetTab ? activeSetTab.getAttribute('data-provider') : 'gmail';
  openGuideModal(provider);
});

// Close Setup Guide Modal
function closeGuideModal() {
  document.getElementById('guide-modal')?.classList.add('hidden');
}

document.getElementById('guide-modal-close')?.addEventListener('click', () => closeModal('guide-modal'));
document.getElementById('guide-modal-bg')?.addEventListener('click', () => closeModal('guide-modal'));

document.getElementById('form-login')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  btnLoading(submitBtn, true);
  try {
    const recaptchaToken = await getRecaptchaToken('login');
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: document.getElementById('login-email').value, password: document.getElementById('login-pass').value, recaptchaToken })
    });
    token = data.token;
    const rememberMe = document.getElementById('remember-me')?.checked;
    const emailVal = document.getElementById('login-email').value;
    if (rememberMe) {
      localStorage.setItem('kk_token', token);
      localStorage.setItem('autoinbox_remembered_email', emailVal);
      if (data.name) localStorage.setItem('autoinbox_name', data.name);
    } else {
      sessionStorage.setItem('kk_token', token);
      localStorage.removeItem('autoinbox_remembered_email');
      if (data.name) sessionStorage.setItem('autoinbox_name', data.name);
    }
    enterDashboard();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
  } finally {
    btnDone(submitBtn);
  }
});

// ===== Password Strength & Toggle =====
const regPass = document.getElementById('reg-pass');
const passBar = document.getElementById('pass-bar');
const passLabel = document.getElementById('pass-label');
if (regPass) {
  regPass.addEventListener('input', () => {
    const v = regPass.value;
    let score = 0;
    if (v.length >= 6) score++;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    passBar.className = 'pass-bar';
    passLabel.className = 'pass-label';
    if (v.length === 0) { passLabel.textContent = ''; return; }
    if (score <= 2) { passBar.classList.add('weak'); passLabel.classList.add('weak'); passLabel.textContent = 'Weak — add uppercase, numbers, or symbols'; }
    else if (score <= 3) { passBar.classList.add('medium'); passLabel.classList.add('medium'); passLabel.textContent = 'Medium — getting better'; }
    else { passBar.classList.add('strong'); passLabel.classList.add('strong'); passLabel.textContent = 'Strong — great password!'; }
  });
}
// ===== Confirm Password Match Checker =====
const regPassConfirm = document.getElementById('reg-pass-confirm');
const confirmBar = document.getElementById('confirm-bar');
const confirmLabel = document.getElementById('confirm-label');
function checkPassMatch() {
  if (!regPassConfirm || !confirmBar || !confirmLabel) return;
  const pass = regPass ? regPass.value : '';
  const confirm = regPassConfirm.value;
  confirmBar.className = 'pass-bar';
  confirmLabel.className = 'pass-label';
  if (confirm.length === 0) { confirmLabel.textContent = ''; return; }
  if (pass === confirm) {
    confirmBar.classList.add('strong');
    confirmLabel.classList.add('strong');
    confirmLabel.textContent = 'Passwords match ✓';
  } else {
    confirmBar.classList.add('weak');
    confirmLabel.classList.add('weak');
    confirmLabel.textContent = 'Passwords do not match';
  }
}
if (regPassConfirm) { regPassConfirm.addEventListener('input', checkPassMatch); }
if (regPass) { regPass.addEventListener('input', () => { checkPassMatch(); }); }
// Show/Hide Password Toggles
const eyeOpen = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const eyeClosed = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
document.getElementById('toggle-pass')?.addEventListener('click', function() {
  const inp = document.getElementById('reg-pass');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  this.innerHTML = show ? eyeClosed + ' Hide' : eyeOpen + ' Show';
});
document.getElementById('toggle-pass-confirm')?.addEventListener('click', function() {
  const inp = document.getElementById('reg-pass-confirm');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  this.innerHTML = show ? eyeClosed + ' Hide' : eyeOpen + ' Show';
});
document.getElementById('toggle-login-pass')?.addEventListener('click', function() {
  const inp = document.getElementById('login-pass');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  this.innerHTML = show ? eyeClosed + ' Hide' : eyeOpen + ' Show';
});

// ===== Legal Modals (Terms & Privacy) =====
const legalCache = {};

async function loadLegalContent(type) {
  if (legalCache[type]) return legalCache[type];
  try {
    const res = await fetch(`/${type}.html`);
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const sections = doc.querySelectorAll('.legal-section');
    let content = '';

    // Add summary if exists
    const summary = doc.querySelector('.legal-summary .summary-text');
    if (summary) {
      content += `<div class="lm-summary"><strong>In Short:</strong> ${summary.innerHTML}</div>`;
    }

    sections.forEach(sec => {
      const num = sec.querySelector('.section-num')?.textContent || '';
      const title = sec.querySelector('.section-title')?.textContent || '';
      const body = sec.querySelector('.section-body')?.innerHTML || '';
      content += `<h3><span class="lm-num">${num}</span>${title}</h3>${body}`;
    });

    legalCache[type] = content;
    return content;
  } catch (e) {
    return '<p style="color:#ef4444">Failed to load. Please try again.</p>';
  }
}

function openLegalModal(type) {
  const modal = document.getElementById(`${type}-modal`);
  const body = document.getElementById(`${type}-modal-body`);
  if (!modal || !body) return;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  loadLegalContent(type).then(html => {
    body.innerHTML = html;
  });
}

function closeLegalModal(type) {
  const modal = document.getElementById(`${type}-modal`);
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
}

// Open modals from registration checkbox links
document.getElementById('link-open-terms')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  openLegalModal('terms');
});
document.getElementById('link-open-privacy')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  openLegalModal('privacy');
});

// Close buttons
document.getElementById('terms-modal-close')?.addEventListener('click', () => closeLegalModal('terms'));
document.getElementById('terms-modal-bg')?.addEventListener('click', () => closeLegalModal('terms'));
document.getElementById('privacy-modal-close')?.addEventListener('click', () => closeLegalModal('privacy'));
document.getElementById('privacy-modal-bg')?.addEventListener('click', () => closeLegalModal('privacy'));

// "I've Read & Understood" buttons — close modal and auto-check the agree checkbox
document.getElementById('terms-modal-accept')?.addEventListener('click', () => {
  closeLegalModal('terms');
  const cb = document.getElementById('reg-agree');
  if (cb) cb.checked = true;
});
document.getElementById('privacy-modal-accept')?.addEventListener('click', () => {
  closeLegalModal('privacy');
  const cb = document.getElementById('reg-agree');
  if (cb) cb.checked = true;
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLegalModal('terms');
    closeLegalModal('privacy');
  }
});

// ===== REGISTRATION FORM VALIDATION =====
const regValidation = {
  // Regex: letters, spaces, hyphens, apostrophes, accented chars — min 2 chars
  nameRegex: /^[A-Za-zÀ-ÿÑñ\s'\-]{2,50}$/,
  // Regex: digits only, 7-14 digits (covers most international phone formats)
  phoneRegex: /^\d{7,14}$/,
  // Regex: basic email format
  emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,

  // Show inline error under a field
  showFieldErr(inputEl, errId, msg) {
    const el = document.getElementById(errId);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    inputEl.classList.add('input-invalid');
    inputEl.classList.remove('input-valid');
  },
  // Clear inline error and mark valid
  clearFieldErr(inputEl, errId) {
    const el = document.getElementById(errId);
    if (!el) return;
    el.textContent = '';
    el.classList.add('hidden');
    inputEl.classList.remove('input-invalid');
    inputEl.classList.add('input-valid');
  },
  // Reset field to neutral (no valid/invalid border)
  resetField(inputEl, errId) {
    const el = document.getElementById(errId);
    if (!el) return;
    el.textContent = '';
    el.classList.add('hidden');
    inputEl.classList.remove('input-invalid', 'input-valid');
  },

  // Auto-capitalize: "maria dela cruz" → "Maria Dela Cruz"
  autoCapitalize(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
  },

  // Validate a name field (returns error message or null)
  validateName(val, fieldLabel, required) {
    if (!val && !required) return null; // optional + empty = ok
    if (!val && required) return `${fieldLabel} is required.`;
    if (val.length < 2) return `${fieldLabel} must be at least 2 characters.`;
    if (/\d/.test(val)) return `${fieldLabel} must not contain numbers.`;
    if (/[^A-Za-zÀ-ÿÑñ\s'\-]/.test(val)) return `${fieldLabel} must contain only letters, spaces, hyphens, or apostrophes.`;
    if (!this.nameRegex.test(val)) return `Please enter a valid ${fieldLabel.toLowerCase()}.`;
    return null;
  },

  // Validate phone
  validatePhone(val) {
    if (!val) return 'Phone number is required.';
    if (/[^0-9]/.test(val)) return 'Phone number must contain only digits.';
    if (val.length < 7) return 'Phone number is too short (minimum 7 digits).';
    if (val.length > 14) return 'Phone number is too long (maximum 14 digits).';
    return null;
  },

  // Validate email
  validateEmail(val) {
    if (!val) return 'Email address is required.';
    if (!this.emailRegex.test(val)) return 'Please enter a valid email address (e.g. you@email.com).';
    return null;
  }
};

// --- Real-time validation listeners ---
// Name fields: filter out invalid chars + auto-capitalize on blur
['reg-fname', 'reg-mname', 'reg-lname'].forEach(id => {
  const input = document.getElementById(id);
  if (!input) return;
  const errId = 'err-' + id.replace('reg-', '');
  const isRequired = id !== 'reg-mname';
  const label = id === 'reg-fname' ? 'First Name' : id === 'reg-mname' ? 'Middle Name' : 'Surname';

  // Block numbers and most special chars while typing
  input.addEventListener('input', () => {
    // Strip numbers and disallowed special characters in real-time
    const cleaned = input.value.replace(/[^A-Za-zÀ-ÿÑñ\s'\-]/g, '');
    if (cleaned !== input.value) {
      const pos = input.selectionStart - (input.value.length - cleaned.length);
      input.value = cleaned;
      input.setSelectionRange(pos, pos);
    }
    // Validate after cleaning
    const val = input.value.trim();
    if (!val && !isRequired) { regValidation.resetField(input, errId); return; }
    const err = regValidation.validateName(val, label, isRequired);
    if (err) regValidation.showFieldErr(input, errId, err);
    else regValidation.clearFieldErr(input, errId);
  });

  // Auto-capitalize on blur
  input.addEventListener('blur', () => {
    if (input.value.trim()) {
      input.value = regValidation.autoCapitalize(input.value.trim());
    }
    const val = input.value.trim();
    if (!val && !isRequired) { regValidation.resetField(input, errId); return; }
    const err = regValidation.validateName(val, label, isRequired);
    if (err) regValidation.showFieldErr(input, errId, err);
    else regValidation.clearFieldErr(input, errId);
  });
});

// Phone: digits only enforcement
(() => {
  const phoneInput = document.getElementById('reg-phone');
  if (!phoneInput) return;
  // Block any non-digit characters
  phoneInput.addEventListener('input', () => {
    const cleaned = phoneInput.value.replace(/\D/g, '');
    if (cleaned !== phoneInput.value) {
      const pos = phoneInput.selectionStart - (phoneInput.value.length - cleaned.length);
      phoneInput.value = cleaned;
      phoneInput.setSelectionRange(pos, pos);
    }
    const val = phoneInput.value.trim();
    if (!val) { regValidation.resetField(phoneInput, 'err-phone'); return; }
    const err = regValidation.validatePhone(val);
    if (err) regValidation.showFieldErr(phoneInput, 'err-phone', err);
    else regValidation.clearFieldErr(phoneInput, 'err-phone');
  });
  phoneInput.addEventListener('blur', () => {
    const val = phoneInput.value.trim();
    if (!val) { regValidation.resetField(phoneInput, 'err-phone'); return; }
    const err = regValidation.validatePhone(val);
    if (err) regValidation.showFieldErr(phoneInput, 'err-phone', err);
    else regValidation.clearFieldErr(phoneInput, 'err-phone');
  });
})();

// Email: format check
(() => {
  const emailInput = document.getElementById('reg-email');
  if (!emailInput) return;
  emailInput.addEventListener('blur', () => {
    const val = emailInput.value.trim();
    if (!val) { regValidation.resetField(emailInput, 'err-email'); return; }
    const err = regValidation.validateEmail(val);
    if (err) regValidation.showFieldErr(emailInput, 'err-email', err);
    else regValidation.clearFieldErr(emailInput, 'err-email');
  });
  emailInput.addEventListener('input', () => {
    const val = emailInput.value.trim();
    if (!val) { regValidation.resetField(emailInput, 'err-email'); return; }
    // Only validate on input if they already had an error showing
    if (emailInput.classList.contains('input-invalid')) {
      const err = regValidation.validateEmail(val);
      if (err) regValidation.showFieldErr(emailInput, 'err-email', err);
      else regValidation.clearFieldErr(emailInput, 'err-email');
    }
  });
})();

// ===== REGISTRATION FORM SUBMIT =====
document.getElementById('form-register')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('reg-error');
  errEl.classList.add('hidden');

  // Gather values
  const fname = document.getElementById('reg-fname').value.trim();
  const mname = document.getElementById('reg-mname').value.trim();
  const lname = document.getElementById('reg-lname').value.trim();
  const suffix = document.getElementById('reg-suffix').value.trim();
  const phoneVal = document.getElementById('reg-phone').value.trim();
  const emailVal = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  const confirmPass = document.getElementById('reg-pass-confirm').value;
  const agree = document.getElementById('reg-agree');

  // Run all field validations
  let hasErrors = false;

  const fnameErr = regValidation.validateName(fname, 'First Name', true);
  if (fnameErr) { regValidation.showFieldErr(document.getElementById('reg-fname'), 'err-fname', fnameErr); hasErrors = true; }
  else { regValidation.clearFieldErr(document.getElementById('reg-fname'), 'err-fname'); }

  const mnameErr = regValidation.validateName(mname, 'Middle Name', false);
  if (mnameErr) { regValidation.showFieldErr(document.getElementById('reg-mname'), 'err-mname', mnameErr); hasErrors = true; }
  else if (mname) { regValidation.clearFieldErr(document.getElementById('reg-mname'), 'err-mname'); }

  const lnameErr = regValidation.validateName(lname, 'Surname', true);
  if (lnameErr) { regValidation.showFieldErr(document.getElementById('reg-lname'), 'err-lname', lnameErr); hasErrors = true; }
  else { regValidation.clearFieldErr(document.getElementById('reg-lname'), 'err-lname'); }

  const phoneErr = regValidation.validatePhone(phoneVal);
  if (phoneErr) { regValidation.showFieldErr(document.getElementById('reg-phone'), 'err-phone', phoneErr); hasErrors = true; }
  else { regValidation.clearFieldErr(document.getElementById('reg-phone'), 'err-phone'); }

  const emailErr = regValidation.validateEmail(emailVal);
  if (emailErr) { regValidation.showFieldErr(document.getElementById('reg-email'), 'err-email', emailErr); hasErrors = true; }
  else { regValidation.clearFieldErr(document.getElementById('reg-email'), 'err-email'); }

  if (hasErrors) {
    errEl.textContent = 'Please fix the errors above before continuing.';
    errEl.classList.remove('hidden');
    return;
  }

  // Password match check
  if (pass !== confirmPass) {
    errEl.textContent = 'Passwords do not match.';
    errEl.classList.remove('hidden');
    return;
  }
  // Terms checkbox
  if (!agree.checked) {
    errEl.textContent = 'Please agree to the Terms of Service and Privacy Policy.';
    errEl.classList.remove('hidden');
    return;
  }
  // Profanity check on name fields
  if (checkFormProfanity(fname, mname, lname, suffix)) {
    errEl.textContent = 'Inappropriate language detected. Please use proper words.';
    errEl.classList.remove('hidden');
    return;
  }

  const prefix = document.getElementById('reg-phone-prefix')?.value || '';
  const rawPhone = phoneVal;
  const phone = rawPhone ? (prefix + rawPhone) : '';
  const submitBtn = e.target.querySelector('button[type="submit"]');
  btnLoading(submitBtn, true);
  try {
    const recaptchaToken = await getRecaptchaToken('register');
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: [fname, mname, lname, suffix].filter(Boolean).join(' '),
        email: emailVal,
        phone: phone || null,
        password: pass,
        recaptchaToken
      })
    });
    token = data.token;
    localStorage.setItem('kk_token', token);
    showPage('onboard');
    initOnboarding();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
  } finally {
    btnDone(submitBtn);
  }
});

document.getElementById('btn-logout')?.addEventListener('click', () => {
  document.getElementById('logout-modal')?.classList.remove('hidden');
});

document.getElementById('logout-confirm')?.addEventListener('click', () => {
  token = '';
  localStorage.removeItem('kk_token');
  localStorage.removeItem('autoinbox_name');
  sessionStorage.removeItem('kk_token');
  sessionStorage.removeItem('autoinbox_name');
  if (refreshTimer) clearInterval(refreshTimer);
  window._isAdmin = false;
  document.getElementById('logout-modal')?.classList.add('hidden');
  history.replaceState(null, '', window.location.pathname);
  showPage('landing');
});

document.getElementById('logout-cancel')?.addEventListener('click', () => {
  document.getElementById('logout-modal')?.classList.add('hidden');
});

// Close logout modal when clicking background
document.getElementById('logout-modal')?.querySelector('.modal-bg')?.addEventListener('click', () => {
  document.getElementById('logout-modal')?.classList.add('hidden');
});

// Settings page logout button (same as sidebar logout)
document.getElementById('btn-logout-settings')?.addEventListener('click', () => {
  document.getElementById('logout-modal')?.classList.remove('hidden');
});

// ===== Onboarding =====
let obStep = 1;

function switchOnboardingProvider(provider) {
  const tabs = document.querySelectorAll('#ob-provider-tabs .tab');
  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-provider') === provider);
  });

  const desc = document.getElementById('ob-desc');
  const emailLbl = document.getElementById('ob-email-lbl');
  const emailInput = document.getElementById('ob-email');
  const passGuide = document.getElementById('ob-pass-guide');

  if (provider === 'yahoo') {
    if (desc) desc.textContent = 'Link your Yahoo Mail so our AI can monitor your inbox.';
    if (emailLbl) emailLbl.textContent = 'Yahoo Mail Address';
    if (emailInput) emailInput.placeholder = 'you@yahoo.com';
    if (passGuide) {
      passGuide.href = 'https://login.yahoo.com/account/security';
      passGuide.textContent = 'Yahoo Security →';
    }
  } else {
    if (desc) desc.textContent = 'Link your Gmail so our AI can monitor your inbox.';
    if (emailLbl) emailLbl.textContent = 'Gmail Address';
    if (emailInput) emailInput.placeholder = 'you@gmail.com';
    if (passGuide) {
      passGuide.href = 'https://myaccount.google.com/apppasswords';
      passGuide.textContent = 'Get here →';
    }
  }
}

// Add onboarding tab click listeners
document.querySelectorAll('#ob-provider-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const provider = tab.getAttribute('data-provider');
    switchOnboardingProvider(provider);
  });
});

function initOnboarding() {
  obStep = 1;
  switchOnboardingProvider('gmail');
  updateOnboardUI();
}

function updateOnboardUI() {
  [1, 2, 3].forEach(i => {
    document.getElementById(`onboard-step-${i}`)?.classList.toggle('hidden', i !== obStep);
  });
  document.getElementById('onboard-progress').style.width = `${(obStep / 3) * 100}%`;
  document.getElementById('onboard-step-label').textContent = `Step ${obStep} of 3`;
}

// Step 1: Connect Email
document.getElementById('ob-next-1')?.addEventListener('click', async () => {
  const errEl = document.getElementById('ob-email-error');
  errEl.classList.add('hidden');
  const email = document.getElementById('ob-email').value;
  const pass = document.getElementById('ob-pass').value;
  if (!email || !pass) { errEl.textContent = 'Please fill in both fields'; errEl.classList.remove('hidden'); return; }
  try {
    await api('/email/connect', { method: 'POST', body: JSON.stringify({ email_address: email, email_password: pass.replace(/\s/g, '') }) });
    showToast('Email connected!');
    obStep = 2; updateOnboardUI();
  } catch (e) { errEl.textContent = e.message; errEl.classList.remove('hidden'); }
});

document.getElementById('ob-skip-1')?.addEventListener('click', () => { obStep = 2; updateOnboardUI(); });

// Step 2: Voice Clone
document.getElementById('ob-add-sample')?.addEventListener('click', () => {
  const container = document.getElementById('voice-samples-container');
  const count = container.querySelectorAll('.voice-sample').length + 1;
  const div = document.createElement('div');
  div.className = 'form-group sample-group';
  div.innerHTML = `<label>Sample Reply ${count}</label><textarea class="voice-sample" rows="3" placeholder="Paste another real reply..."></textarea>`;
  container.appendChild(div);
});

document.getElementById('ob-next-2')?.addEventListener('click', async () => {
  const errEl = document.getElementById('ob-voice-error');
  errEl.classList.add('hidden');
  const samples = [...document.querySelectorAll('#voice-samples-container .voice-sample')].map(t => t.value).filter(s => s.trim());
  if (samples.length < 3) { errEl.textContent = 'Need at least 3 sample replies'; errEl.classList.remove('hidden'); return; }
  // Profanity check on voice samples
  if (checkFormProfanity(...samples)) {
    errEl.textContent = 'Inappropriate language detected in your samples. Please remove offensive words.';
    errEl.classList.remove('hidden');
    return;
  }
  try {
    await api('/voice/samples', { method: 'POST', body: JSON.stringify({ samples }) });
    showToast('Analyzing your style...');
    const result = await api('/voice/analyze', { method: 'POST' });
    if (result.success && result.profile) {
      const pp = document.getElementById('profile-details');
      pp.innerHTML = `
        <p><strong>Tone:</strong> ${result.profile.tone}</p>
        <p><strong>Language:</strong> ${result.profile.language}</p>
        <p><strong>Greeting:</strong> ${result.profile.greeting_style}</p>
        <p><strong>Emoji:</strong> ${result.profile.emoji_usage}</p>
        <p><strong>Personality:</strong> ${result.profile.personality}</p>
      `;
      document.getElementById('voice-profile-preview').classList.remove('hidden');
    }
    obStep = 3; updateOnboardUI();
  } catch (e) { errEl.textContent = e.message; errEl.classList.remove('hidden'); }
});

document.getElementById('ob-skip-2')?.addEventListener('click', () => { obStep = 3; updateOnboardUI(); });
document.getElementById('ob-finish')?.addEventListener('click', () => enterDashboard());

// ===== Dashboard =====
async function enterDashboard() {
  showPage('dashboard');
  showDashSection('inbox');
  loadMessages();
  loadStats();
  loadEmailStatus();
  loadSidebarPlan();
  checkAdmin();
  // Set user name in sidebar + settings logout card
  const userName = localStorage.getItem('autoinbox_name');
  if (userName) {
    const userEl = document.getElementById('sidebar-user');
    if (userEl) userEl.textContent = userName;
    const settingsUserEl = document.getElementById('settings-user-display');
    if (settingsUserEl) settingsUserEl.textContent = userName;
  }
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => { loadMessages(); loadStats(); loadEmailStatus(); }, 10000);
}

async function checkAdmin() {
  try {
    const data = await api('/admin/stats');
    // If we get here, user is admin
    document.getElementById('nav-admin')?.classList.remove('hidden');
    document.getElementById('mnav-admin')?.classList.remove('hidden');
    window._isAdmin = true;
    window._adminData = data;
  } catch (e) {
    // Not admin — hide button
    document.getElementById('nav-admin')?.classList.add('hidden');
    document.getElementById('mnav-admin')?.classList.add('hidden');
    window._isAdmin = false;
  }
}

async function loadAdminStats() {
  try {
    const data = await api('/admin/stats');
    document.getElementById('admin-total-users').textContent = data.totalUsers;
    document.getElementById('admin-paying').textContent = data.payingUsers;
    document.getElementById('admin-free').textContent = data.freeUsers;
    document.getElementById('admin-today').textContent = data.todaySignups;
    document.getElementById('admin-revenue').textContent = CURRENCY.symbol + data.totalRevenue.toLocaleString();
    
    const tbody = document.getElementById('admin-users-body');
    if (tbody && data.recentUsers.length) {
      tbody.innerHTML = data.recentUsers.map((u, i) => 
        `<tr><td>${i+1}</td><td>${escHtml(u.name)}</td><td>${escHtml(u.email)}</td><td>${new Date(u.created_at).toLocaleDateString()}</td></tr>`
      ).join('');
    } else if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" style="color:var(--t3)">No users yet</td></tr>';
    }

    const fTbody = document.getElementById('admin-feedback-body');
    if (fTbody && data.recentFeedback && data.recentFeedback.length) {
      fTbody.innerHTML = data.recentFeedback.map((f, i) => 
        `<tr><td>${i+1}</td><td>${escHtml(f.name) || 'Anonymous'}</td><td>${escHtml(f.email)}</td><td style="white-space:pre-wrap;max-width:300px">${escHtml(f.message)}</td><td>${new Date(f.created_at).toLocaleDateString()}</td></tr>`
      ).join('');
    } else if (fTbody) {
      fTbody.innerHTML = '<tr><td colspan="5" style="color:var(--t3)">No feedback received yet</td></tr>';
    }
  } catch (e) { console.error('Admin stats error:', e); }
}

async function loadSidebarPlan() {
  try {
    const data = await api('/plan');
    const badge = document.getElementById('sidebar-plan');
    if (badge && data) {
      const planName = data.plan === 'pro' ? 'Pro Plan' : data.plan === 'basic' ? 'Basic Plan' : 'Free Plan';
      badge.querySelector('span:last-child').textContent = planName;
      badge.className = 'plan-badge' + (data.plan === 'pro' ? ' pro' : data.plan === 'basic' ? ' basic' : '');
    }
  } catch (e) { /* silent */ }
}

// Sidebar nav
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    showDashSection(page);
    if (page === 'voice') loadVoicePage();
    if (page === 'settings') loadSettings();
    if (page === 'plan') loadPlanPage();
    if (page === 'admin') loadAdminStats();
  });
});

// Mobile nav
document.querySelectorAll('.mnav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    document.querySelectorAll('.mnav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    showDashSection(page);
    if (page === 'voice') loadVoicePage();
    if (page === 'settings') loadSettings();
    if (page === 'plan') loadPlanPage();
    if (page === 'admin') loadAdminStats();
  });
});

// ===== Plan & Billing Page =====
async function loadPlanPage() {
  try {
    const data = await api('/plan');
    const plan = data?.plan || 'free';
    const prices = { free: CURRENCY.freeFull, basic: CURRENCY.basicFull, pro: CURRENCY.proFull };
    
    document.getElementById('cpd-name').textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
    document.getElementById('cpd-price').textContent = prices[plan] || '₱0/mo';
    document.getElementById('cpd-status').textContent = data?.status || 'Active';

    // Reset classes
    document.querySelectorAll('.plan-option').forEach(o => o.classList.remove('current'));
    
    const freeEl = document.getElementById('po-free');
    const basicEl = document.getElementById('po-basic');
    const proEl = document.getElementById('po-pro');
    
    const freeBtn = freeEl?.querySelector('button');
    const basicBtn = basicEl?.querySelector('button');
    const proBtn = proEl?.querySelector('button');

    // Highlight current plan
    const currentEl = document.getElementById(`po-${plan}`);
    if (currentEl) {
      currentEl.classList.add('current');
    }

    // ALL buttons are always active — never disabled
    // Free button
    if (freeBtn) {
      freeBtn.disabled = false;
      if (plan === 'free') {
        freeBtn.textContent = '✓ Active Plan';
        freeBtn.className = 'btn-accent btn-full btn-active-plan';
        freeBtn.onclick = () => showToast('You are already on the Free plan', 'info');
      } else {
        freeBtn.textContent = 'Switch to Free';
        freeBtn.className = 'btn-ghost btn-full btn-switch';
        freeBtn.onclick = () => handleDowngrade('free');
      }
    }

    // Basic button
    if (basicBtn) {
      basicBtn.disabled = false;
      if (plan === 'basic') {
        basicBtn.textContent = '✓ Active Plan';
        basicBtn.className = 'btn-accent btn-full btn-active-plan';
        basicBtn.onclick = () => showToast('You are already on the Basic plan', 'info');
      } else if (plan === 'pro') {
        basicBtn.textContent = 'Switch to Basic';
        basicBtn.className = 'btn-ghost btn-full btn-switch';
        basicBtn.onclick = () => handleDowngrade('basic');
      } else {
        basicBtn.textContent = 'Start 7-Day Free Trial';
        basicBtn.className = 'btn-accent btn-full';
        basicBtn.onclick = () => handleUpgrade('basic');
      }
    }

    // Pro button
    if (proBtn) {
      proBtn.disabled = false;
      if (plan === 'pro') {
        proBtn.textContent = '✓ Active Plan';
        proBtn.className = 'btn-accent btn-full btn-active-plan btn-pro-active';
        proBtn.onclick = () => showToast('You are already on the Pro plan', 'info');
      } else {
        proBtn.textContent = 'Subscribe Now';
        proBtn.className = 'btn-accent btn-full btn-pro';
        proBtn.onclick = () => handleUpgrade('pro');
      }
    }
  } catch (e) { /* silent */ }
}

// Downgrade handler with confirmation
async function handleDowngrade(targetPlan) {
  const planLabel = targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1);
  const confirmed = confirm(`Are you sure you want to switch to the ${planLabel} plan?\n\nYour current plan features will change accordingly.`);
  if (!confirmed) return;

  try {
    showToast('Processing...', 'info');
    const data = await api('/downgrade', { method: 'POST', body: JSON.stringify({ targetPlan }) });
    if (data.success) {
      showToast(`Successfully switched to ${planLabel} plan!`, 'success');
      loadPlanPage();
    } else {
      showToast(data.error || 'Switch failed', 'error');
    }
  } catch (e) {
    showToast(e.message || 'Error switching plan', 'error');
  }
}

// Upgrade handler — redirects to PayMongo checkout
async function handleUpgrade(plan) {
  try {
    showToast('Redirecting to payment...');
    const data = await api('/checkout', { method: 'POST', body: JSON.stringify({ plan }) });
    if (data.checkout_url) {
      window.location.href = data.checkout_url;
    } else {
      showToast(data.error || 'Checkout failed', 'error');
    }
  } catch (e) {
    showToast(e.message || 'Payment error', 'error');
  }
}

// ===== Messages =====
function escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

function timeAgo(ts) {
  if (!ts) return '';
  // Handle timestamps with or without timezone info
  const d = new Date(ts);
  const parsed = isNaN(d.getTime()) ? new Date(ts + 'Z') : d;
  const diff = (Date.now() - parsed.getTime()) / 1000;
  if (isNaN(diff) || diff < 0) return '';
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function loadMessages() {
  try {
    const data = await api('/messages');
    const list = document.getElementById('message-list');
    let msgs = data.messages || [];
    if (currentFilter !== 'all') msgs = msgs.filter(m => m.status === currentFilter);

    if (!msgs.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">📬</div><p class="empty-title">No messages found</p><p class="empty-sub">Messages will appear here when received.</p></div>`;
      return;
    }

    list.innerHTML = msgs.map(msg => `
      <div class="message-card" data-id="${msg.id}">
        <div class="message-avatar">${msg.platform === 'email' ? '📧' : '💬'}</div>
        <div class="message-info">
          <div class="message-sender">${escHtml(msg.sender_name || msg.sender_id)}</div>
          <div class="message-subject">${escHtml(msg.subject || '')}</div>
          <div class="message-preview">${escHtml((msg.body || '').substring(0, 100))}</div>
        </div>
        <div class="message-meta">
          <span class="message-time">${timeAgo(msg.received_at)}</span>
          <span class="status-tag ${msg.status}">${msg.status}</span>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.message-card').forEach(card => {
      card.addEventListener('click', () => openMessage(parseInt(card.dataset.id)));
    });
  } catch (e) { /* silent */ }
}

// Filters
document.querySelectorAll('.filter-tabs .tab[data-filter]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    loadMessages();
  });
});

async function loadStats() {
  try {
    const s = await api('/stats');
    document.getElementById('stat-today').textContent = s.today || 0;
    document.getElementById('stat-pending').textContent = (s.byStatus?.pending || 0) + (s.byStatus?.drafted || 0);
    document.getElementById('stat-sent').textContent = s.byStatus?.sent || 0;

    const pending = (s.byStatus?.pending || 0) + (s.byStatus?.drafted || 0);
    const badge = document.getElementById('inbox-badge');
    if (pending > 0) { badge.textContent = pending; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }

    const dot = document.getElementById('monitor-dot');
    dot.classList.toggle('active', s.email?.connected || false);
  } catch (e) { /* silent */ }
}

async function loadEmailStatus() {
  try {
    const s = await api('/email/status');
    document.getElementById('monitor-label').textContent = s.email || 'Not connected';
  } catch (e) { /* silent */ }
}

// ===== Message Modal =====
async function openMessage(id) {
  try {
    const data = await api(`/messages/${id}`);
    currentMsgId = id;
    document.getElementById('modal-sender').textContent = data.message.sender_name || data.message.sender_id;
    document.getElementById('modal-subject').textContent = data.message.subject || '';
    document.getElementById('modal-body').textContent = data.message.body || '';
    document.getElementById('modal-draft').value = data.draft?.edited_content || data.draft?.content || '(No draft yet)';
    document.getElementById('message-modal').classList.remove('hidden');

    const isSent = data.message.status === 'sent' || data.message.status === 'rejected';
    document.getElementById('modal-approve').style.display = isSent ? 'none' : '';
    document.getElementById('modal-reject').style.display = isSent ? 'none' : '';
    document.getElementById('modal-regen').style.display = isSent ? 'none' : '';
    document.getElementById('modal-draft').readOnly = isSent;
  } catch (e) { showToast(e.message, 'error'); }
}

document.getElementById('modal-close')?.addEventListener('click', () => {
  document.getElementById('message-modal').classList.add('hidden');
});
document.getElementById('message-modal')?.querySelector('.modal-bg')?.addEventListener('click', () => {
  document.getElementById('message-modal').classList.add('hidden');
});

document.getElementById('modal-approve')?.addEventListener('click', async () => {
  try {
    const content = document.getElementById('modal-draft').value;
    await api(`/messages/${currentMsgId}/edit`, { method: 'POST', body: JSON.stringify({ content }) });
    await api(`/messages/${currentMsgId}/approve`, { method: 'POST' });
    showToast('Reply sent! ✅');
    document.getElementById('message-modal').classList.add('hidden');
    loadMessages(); loadStats();
  } catch (e) { showToast(e.message, 'error'); }
});

document.getElementById('modal-reject')?.addEventListener('click', async () => {
  try {
    await api(`/messages/${currentMsgId}/reject`, { method: 'POST' });
    showToast('Message skipped');
    document.getElementById('message-modal').classList.add('hidden');
    loadMessages(); loadStats();
  } catch (e) { showToast(e.message, 'error'); }
});

document.getElementById('modal-regen')?.addEventListener('click', async () => {
  try {
    showToast('Regenerating...');
    const data = await api(`/messages/${currentMsgId}/regenerate`, { method: 'POST' });
    document.getElementById('modal-draft').value = data.draft || '';
    showToast('New draft ready!');
  } catch (e) { showToast(e.message, 'error'); }
});

// ===== Voice Clone Page =====
async function loadVoicePage() {
  try {
    const data = await api('/voice/profile');
    const pp = document.getElementById('dash-voice-profile');
    if (data.profile) {
      pp.innerHTML = `
        <p><strong>Tone:</strong> ${data.profile.tone}</p>
        <p><strong>Language:</strong> ${data.profile.language}</p>
        <p><strong>Greeting:</strong> ${data.profile.greeting_style}</p>
        <p><strong>Emoji:</strong> ${data.profile.emoji_usage}</p>
        <p><strong>Sign-off:</strong> ${data.profile.signoff_style}</p>
        <p><strong>Personality:</strong> ${data.profile.personality}</p>
      `;
    } else {
      pp.innerHTML = '<p class="empty-sub">No voice profile yet. Add samples below to train your AI clone.</p>';
    }

    const sc = document.getElementById('dash-voice-samples');
    sc.innerHTML = '';
    for (let i = 0; i < Math.max(3, data.sampleCount); i++) {
      const div = document.createElement('div');
      div.className = 'form-group sample-group';
      div.innerHTML = `<label>Sample ${i + 1}</label><textarea class="dash-voice-sample" rows="3" placeholder="Paste a real reply..."></textarea>`;
      sc.appendChild(div);
    }
  } catch (e) { /* silent */ }
}

document.getElementById('dash-add-sample')?.addEventListener('click', () => {
  const sc = document.getElementById('dash-voice-samples');
  const count = sc.querySelectorAll('.dash-voice-sample').length + 1;
  const div = document.createElement('div');
  div.className = 'form-group sample-group';
  div.innerHTML = `<label>Sample ${count}</label><textarea class="dash-voice-sample" rows="3" placeholder="Paste a real reply..."></textarea>`;
  sc.appendChild(div);
});

document.getElementById('dash-analyze')?.addEventListener('click', async () => {
  const samples = [...document.querySelectorAll('.dash-voice-sample')].map(t => t.value).filter(s => s.trim());
  if (samples.length < 3) { showToast('Need at least 3 samples', 'error'); return; }
  try {
    await api('/voice/samples', { method: 'POST', body: JSON.stringify({ samples }) });
    showToast('Analyzing your style...');
    const result = await api('/voice/analyze', { method: 'POST' });
    if (result.success) { showToast('Voice profile updated! 🧠'); loadVoicePage(); }
    else { showToast(result.error || 'Analysis failed', 'error'); }
  } catch (e) { showToast(e.message, 'error'); }
});

// ===== Settings =====
function switchSettingsProvider(provider) {
  const tabs = document.querySelectorAll('#set-provider-tabs .tab');
  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-provider') === provider);
  });

  const emailLbl = document.getElementById('set-email-lbl');
  const emailInput = document.getElementById('set-email');
  const passGuide = document.getElementById('set-pass-guide');

  if (provider === 'yahoo') {
    if (emailLbl) emailLbl.textContent = 'Yahoo Mail Address';
    if (emailInput) emailInput.placeholder = 'you@yahoo.com';
    if (passGuide) {
      passGuide.href = 'https://login.yahoo.com/account/security';
      passGuide.textContent = 'Yahoo Security →';
    }
  } else {
    if (emailLbl) emailLbl.textContent = 'Gmail Address';
    if (emailInput) emailInput.placeholder = 'you@gmail.com';
    if (passGuide) {
      passGuide.href = 'https://myaccount.google.com/apppasswords';
      passGuide.textContent = 'Get here →';
    }
  }
}

// Add settings tab click listeners
document.querySelectorAll('#set-provider-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const provider = tab.getAttribute('data-provider');
    switchSettingsProvider(provider);
  });
});

// Settings sidebar panel navigation
document.querySelectorAll('.settings-sidebar .snav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.settings-sidebar .snav-item').forEach(btn => btn.classList.remove('active'));
    item.classList.add('active');

    document.querySelectorAll('.settings-content .settings-panel').forEach(panel => panel.classList.add('hidden'));

    const section = item.getAttribute('data-settings-section');
    const targetPanel = document.getElementById(`settings-sec-${section}`);
    if (targetPanel) {
      targetPanel.classList.remove('hidden');
    }
  });
});

async function loadSettings() {
  try {
    const s = await api('/settings');
    document.getElementById('set-name').value = s.agent_name || '';
    document.getElementById('set-tone').value = s.agent_tone || 'professional-friendly';
    document.getElementById('set-lang').value = s.agent_language || 'en';
    document.getElementById('set-services').value = s.services || '';
    document.getElementById('set-custom').value = s.custom_instructions || '';

    try {
      const profile = await api('/auth/profile');
      const phoneInput = document.getElementById('set-phone-num');
      if (profile && profile.phone) {
        const prefixes = ['+852', '+886', '+971', '+63', '+65', '+44', '+61', '+81', '+82', '+86', '+91', '+64', '+60', '+62', '+66', '+84', '+33', '+49', '+1'];
        let matchedPrefix = '+63';
        let matchedNumber = profile.phone;
        for (const pref of prefixes) {
          if (profile.phone.startsWith(pref)) {
            matchedPrefix = pref;
            matchedNumber = profile.phone.substring(pref.length);
            break;
          }
        }
        const prefixSelect = document.getElementById('set-phone-prefix');
        if (prefixSelect) prefixSelect.value = matchedPrefix;
        if (phoneInput) phoneInput.value = matchedNumber;
      } else {
        const prefixSelect = document.getElementById('set-phone-prefix');
        if (prefixSelect) prefixSelect.value = '+63';
        if (phoneInput) phoneInput.value = '';
      }
    } catch (err) {}

    const es = await api('/email/status');
    document.getElementById('email-status-text').textContent = es.configured
      ? `Connected: ${es.email}${es.connected ? ' (monitoring)' : ' (inactive)'}`
      : 'Not connected';
    document.getElementById('set-email').value = es.email || '';
    document.getElementById('set-email-disconnect').classList.toggle('hidden', !es.configured);
    document.getElementById('set-email-test').classList.toggle('hidden', !es.configured);
    const details = document.getElementById('connection-health-details');
    if (details) {
      details.classList.add('hidden');
      details.textContent = '';
    }
    
    // Auto-select provider tab based on email domain
    if (es.configured && es.email) {
      const isYahoo = es.email.toLowerCase().endsWith('@yahoo.com') || es.email.toLowerCase().endsWith('@ymail.com');
      switchSettingsProvider(isYahoo ? 'yahoo' : 'gmail');
    } else {
      switchSettingsProvider('gmail');
    }
  } catch (e) { /* silent */ }
}

document.getElementById('set-email-connect')?.addEventListener('click', async () => {
  const email = document.getElementById('set-email').value;
  const pass = document.getElementById('set-email-pass').value;
  if (!email || !pass) { showToast('Fill in email and password', 'error'); return; }
  try {
    await api('/email/connect', { method: 'POST', body: JSON.stringify({ email_address: email, email_password: pass.replace(/\s/g, '') }) });
    showToast('Email connected! ✅'); loadSettings();
  } catch (e) { showToast(e.message, 'error'); }
});

document.getElementById('set-email-disconnect')?.addEventListener('click', async () => {
  try {
    await api('/email/disconnect', { method: 'POST' });
    showToast('Email disconnected'); loadSettings();
  } catch (e) { showToast(e.message, 'error'); }
});

document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
  const nameVal = document.getElementById('set-name').value;
  const servicesVal = document.getElementById('set-services').value;
  const customVal = document.getElementById('set-custom').value;
  // Profanity check
  if (checkFormProfanity(nameVal, servicesVal, customVal)) {
    showToast('Inappropriate language detected. Please remove offensive words.', 'error');
    return;
  }
  try {
    await api('/settings', { method: 'POST', body: JSON.stringify({
      agent_name: nameVal,
      agent_tone: document.getElementById('set-tone').value,
      agent_language: document.getElementById('set-lang').value,
      services: servicesVal,
      custom_instructions: customVal
    }) });
    showToast('Settings saved! ✅');
  } catch (e) { showToast(e.message, 'error'); }
});

// Test Connection Check
document.getElementById('set-email-test')?.addEventListener('click', async () => {
  const btn = document.getElementById('set-email-test');
  const details = document.getElementById('connection-health-details');
  if (!btn || !details) return;

  btn.disabled = true;
  btn.textContent = 'Testing...';
  details.classList.add('hidden');
  details.textContent = '';

  try {
    const data = await api('/email/test', { method: 'POST' });
    details.textContent = data.message || 'Both IMAP and SMTP connections are healthy! ✅';
    details.style.color = 'var(--g)';
    details.classList.remove('hidden');
  } catch (e) {
    details.textContent = e.message || 'Connection test failed.';
    details.style.color = 'var(--r)';
    details.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Test Connection';
  }
});

// Password toggles in Settings
document.getElementById('toggle-curr-pass')?.addEventListener('click', function() {
  const inp = document.getElementById('set-curr-pass');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  this.textContent = show ? 'Hide' : 'Show';
});
document.getElementById('toggle-new-pass')?.addEventListener('click', function() {
  const inp = document.getElementById('set-new-pass');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  this.textContent = show ? 'Hide' : 'Show';
});
document.getElementById('toggle-new-pass-confirm')?.addEventListener('click', function() {
  const inp = document.getElementById('set-new-pass-confirm');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  this.textContent = show ? 'Hide' : 'Show';
});

// Password strength meter for new password in Settings
const setNewPass = document.getElementById('set-new-pass');
const changePassBar = document.getElementById('change-pass-bar');
const changePassLabel = document.getElementById('change-pass-label');
if (setNewPass && changePassBar && changePassLabel) {
  setNewPass.addEventListener('input', () => {
    const v = setNewPass.value;
    let score = 0;
    if (v.length >= 6) score++;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    
    changePassBar.className = 'pass-bar';
    changePassLabel.className = 'pass-label';
    if (v.length === 0) {
      changePassLabel.textContent = '';
      return;
    }
    if (score <= 2) {
      changePassBar.classList.add('weak');
      changePassLabel.classList.add('weak');
      changePassLabel.textContent = 'Weak — add uppercase, numbers, or symbols';
    } else if (score <= 3) {
      changePassBar.classList.add('medium');
      changePassLabel.classList.add('medium');
      changePassLabel.textContent = 'Medium — getting better';
    } else {
      changePassBar.classList.add('strong');
      changePassLabel.classList.add('strong');
      changePassLabel.textContent = 'Strong — great password!';
    }
  });
}

// Change Password form submit
document.getElementById('form-change-password')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const errEl = document.getElementById('change-pass-error');
  const succEl = document.getElementById('change-pass-success');
  const currPass = document.getElementById('set-curr-pass').value;
  const newPass = document.getElementById('set-new-pass').value;
  const confirmNewPass = document.getElementById('set-new-pass-confirm').value;

  errEl.classList.add('hidden');
  succEl.classList.add('hidden');

  if (newPass !== confirmNewPass) {
    errEl.textContent = 'New passwords do not match.';
    errEl.classList.remove('hidden');
    return;
  }

  // Show custom confirmation modal
  document.getElementById('change-pass-modal')?.classList.remove('hidden');
});

// Close password change modal when Cancel is clicked
document.getElementById('change-pass-cancel')?.addEventListener('click', () => {
  document.getElementById('change-pass-modal')?.classList.add('hidden');
});

// Close password change modal when clicking background
document.getElementById('change-pass-modal')?.querySelector('.modal-bg')?.addEventListener('click', () => {
  document.getElementById('change-pass-modal')?.classList.add('hidden');
});

// Handle custom password change confirmation
document.getElementById('change-pass-confirm')?.addEventListener('click', async () => {
  document.getElementById('change-pass-modal')?.classList.add('hidden');

  const errEl = document.getElementById('change-pass-error');
  const succEl = document.getElementById('change-pass-success');
  const currPass = document.getElementById('set-curr-pass').value;
  const newPass = document.getElementById('set-new-pass').value;

  try {
    await api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: currPass, newPassword: newPass })
    });
    
    // Clear inputs
    document.getElementById('set-curr-pass').value = '';
    document.getElementById('set-new-pass').value = '';
    document.getElementById('set-new-pass-confirm').value = '';
    if (changePassLabel) changePassLabel.textContent = '';
    if (changePassBar) changePassBar.className = 'pass-bar';

    succEl.textContent = 'Password updated successfully. Logging out...';
    succEl.classList.remove('hidden');

    setTimeout(() => {
      token = '';
      localStorage.removeItem('kk_token');
      localStorage.removeItem('autoinbox_name');
      sessionStorage.removeItem('kk_token');
      sessionStorage.removeItem('autoinbox_name');
      if (refreshTimer) clearInterval(refreshTimer);
      window._isAdmin = false;
      history.replaceState(null, '', window.location.pathname);
      showPage('landing');
    }, 2000);

  } catch (err) {
    errEl.textContent = err.message || 'Failed to update password.';
    errEl.classList.remove('hidden');
  }
});

// Update Cellphone Number form submit
document.getElementById('form-update-phone')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('update-phone-error');
  const succEl = document.getElementById('update-phone-success');
  const prefix = document.getElementById('set-phone-prefix')?.value || '';
  const num = document.getElementById('set-phone-num')?.value?.trim() || '';
  const phoneVal = num ? (prefix + num) : '';

  errEl.classList.add('hidden');
  succEl.classList.add('hidden');

  try {
    const res = await api('/auth/update-phone', {
      method: 'POST',
      body: JSON.stringify({ phone: phoneVal })
    });
    
    succEl.textContent = res.message || 'Cellphone number updated successfully!';
    succEl.classList.remove('hidden');
  } catch (err) {
    errEl.textContent = err.message || 'Failed to update cellphone number.';
    errEl.classList.remove('hidden');
  }
});

// ===== FAQ Accordion =====
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    document.querySelectorAll('.faq-item').forEach(i => { if (i !== item) i.classList.remove('open'); });
    item.classList.toggle('open');
  });
});

// ===== Scroll Animations =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.anim-up').forEach(el => observer.observe(el));

// Duplicate mobile nav listeners removed — already registered above (line ~1088)
// Duplicate btn-final-cta listener removed — proper one with login check is below (line ~1822)

// ===== Smooth Scroll for Nav & Footer Links =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    if (href === '#' || href === '') return;
    try {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        // Update URL hash without causing page jump
        history.pushState(null, '', href);
      }
    } catch (err) {
      console.warn('Invalid selector or target not found:', href, err);
    }
  });
});

// ===== Ambient Floating Orbs (disabled) =====
// (function initOrbs() { })();

// ===== PWA Install =====
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  showToast('AutoInbox installed successfully! 🎉', 'success');
});

function detectPlatform() {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isMac = /Macintosh/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return { isIOS, isMac, isAndroid, isChrome, isSafari, isFirefox, isStandalone };
}

async function installPWA() {
  const p = detectPlatform();
  console.log('[PWA Install]', { deferredPrompt: !!deferredPrompt, ...p });

  // Already installed as PWA
  if (p.isStandalone) {
    showToast('✅ AutoInbox is already installed!', 'success');
    return;
  }

  // Chrome/Edge — native install prompt
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('Installing AutoInbox... 🎉', 'success');
    }
    deferredPrompt = null;
    return;
  }

  // iOS Safari — show instructions
  if (p.isIOS) {
    showInstallGuide(
      '📱 Install on iPhone/iPad',
      [
        'Tap the <strong>Share</strong> button <span style="font-size:1.2em">⬆️</span> at the bottom of Safari',
        'Scroll down and tap <strong>"Add to Home Screen"</strong>',
        'Tap <strong>"Add"</strong> — AutoInbox icon will appear on your home screen!'
      ]
    );
    return;
  }

  // Mac Safari
  if (p.isMac && p.isSafari) {
    showInstallGuide(
      '💻 Install on Mac',
      [
        'In Safari menu bar, click <strong>File</strong>',
        'Click <strong>"Add to Dock"</strong>',
        'AutoInbox will open as a standalone app!'
      ]
    );
    return;
  }

  // Firefox / other browsers
  showInstallGuide(
    '📥 Install AutoInbox',
    [
      'Open this website in <strong>Google Chrome</strong> for the best install experience',
      'Or bookmark this page and add it to your home screen manually',
      'The app works in any browser — Chrome just offers 1-tap install!'
    ]
  );
}

function showInstallGuide(title, steps) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'pwa-guide-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const stepsHtml = steps.map((s, i) =>
    `<div class="pwa-guide-step">
      <span class="pwa-guide-num">${i + 1}</span>
      <span>${s}</span>
    </div>`
  ).join('');

  overlay.innerHTML = `
    <div class="pwa-guide-modal">
      <button class="pwa-guide-close" onclick="this.closest('.pwa-guide-overlay').remove()">✕</button>
      <h3>${title}</h3>
      <div class="pwa-guide-steps">${stepsHtml}</div>
      <button class="btn-accent" style="width:100%;margin-top:16px;border-radius:12px;padding:12px;" onclick="this.closest('.pwa-guide-overlay').remove()">Got it!</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

// ===== Register Service Worker =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('[SW] Registered:', reg.scope))
    .catch(err => console.warn('[SW] Registration failed:', err));
}

// Bind install button click via JS (fallback for inline onclick)
document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('btn-install-app');
  if (installBtn) {
    installBtn.addEventListener('click', (e) => {
      e.preventDefault();
      installPWA();
    });
  }
});

// ===== Pricing & Checkout =====
async function startCheckout(plan) {
  if (!token) {
    showToast('Please create an account first', 'error');
    closeLandingModals();
    showPage('register');
    return;
  }
  try {
    showToast('Redirecting to checkout...', 'success');
    const data = await api('/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan })
    });
    if (data.checkout_url) {
      closeLandingModals();
      window.location.href = data.checkout_url;
    }
  } catch (e) {
    showToast(e.message || 'Checkout failed', 'error');
  }
}

document.getElementById('price-free')?.addEventListener('click', () => {
  closeLandingModals();
  if (token) { enterDashboard(); }
  else { showPage('register'); }
});
document.getElementById('price-basic')?.addEventListener('click', () => startCheckout('basic'));
document.getElementById('price-pro')?.addEventListener('click', () => startCheckout('pro'));
document.getElementById('btn-final-cta')?.addEventListener('click', () => {
  closeLandingModals();
  if (token) { enterDashboard(); }
  else { showPage('register'); }
});

// Check for payment success in URL
(function checkPaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');
  const plan = params.get('plan');
  if (payment === 'success' && plan) {
    setTimeout(() => showToast(`🎉 Payment successful! You're now on the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan!`, 'success'), 500);
    window.history.replaceState({}, '', '/');
  } else if (payment === 'cancelled') {
    setTimeout(() => showToast('Payment was cancelled', 'error'), 500);
    window.history.replaceState({}, '', '/');
  }
})();



// ===== Scroll Reveal =====
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); revealObserver.unobserve(e.target); } });
}, { threshold: 0.01, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.section, .cta-section').forEach(el => revealObserver.observe(el));

// Fallback manual scroll reveal
function checkRevealFallback() {
  const triggerBottom = window.innerHeight * 0.95;
  document.querySelectorAll('.section, .cta-section').forEach(el => {
    if (!el.classList.contains('revealed')) {
      const rect = el.getBoundingClientRect();
      if (rect.top < triggerBottom && rect.bottom > 0) {
        el.classList.add('revealed');
      }
    }
  });
}
window.addEventListener('scroll', checkRevealFallback);
window.addEventListener('resize', checkRevealFallback);
setTimeout(checkRevealFallback, 100);
setTimeout(checkRevealFallback, 600);

// ===== Multi-Language Showcase Interactive Simulator =====
const DEMO_DATA = {
  ja: {
    avatar: 'YT',
    name: 'Yuki Tanaka',
    clientMsg: 'ウェブサイトの料金を教えてください。',
    aiReply: '基本的なウェブサイトは$150からです。5〜7日で完成いたします。',
    replyBadge: '⚡ Auto-replied in 1.2s'
  },
  ko: {
    avatar: 'MK',
    name: 'Min-Jun Kim',
    clientMsg: '로고 디자인 가격이 얼마인가요?',
    aiReply: '로고 디자인은 $80부터 시작합니다. 3~5일 내 완성됩니다.',
    replyBadge: '⚡ Auto-replied in 0.9s'
  },
  es: {
    avatar: 'SR',
    name: 'Sofía Rodríguez',
    clientMsg: '¿Cuánto cuesta el desarrollo de una app móvil?',
    aiReply: 'El costo inicial es de $500. Depende de las funciones y diseño.',
    replyBadge: '⚡ Auto-replied in 1.5s'
  },
  fr: {
    avatar: 'LM',
    name: 'Lucas Martin',
    clientMsg: 'Faites-vous des designs pour des e-boutiques?',
    aiReply: 'Oui, nous concevons des boutiques Shopify professionnelles dès 300€.',
    replyBadge: '⚡ Auto-replied in 1.1s'
  },
  ar: {
    avatar: 'YA',
    name: 'Yousef Al-Harbi',
    clientMsg: 'هل تقدمون خدمات كتابة المحتوى الإعلاني؟',
    aiReply: 'نعم، نقدم خدمات كتابة محتوى احترافية متوافقة مع السيو بسعر يبدأ من 30$ للصفحة.',
    replyBadge: '⚡ Auto-replied in 1.4s'
  },
  tl: {
    avatar: 'JC',
    name: 'Jay dela Cruz',
    clientMsg: 'Magkano po magpa-gawa ng customized e-commerce site?',
    aiReply: 'Hello Jay! Ang starting price po namin ay ₱7,500, kasama na ang domain, hosting, at payment setup.',
    replyBadge: '⚡ Auto-replied in 0.8s'
  }
};

let demoTimer = null;
let currentDemoLang = 'ja';
let demoAutoCycleRunning = false;

function setActiveTab(lang) {
  const tabs = document.querySelectorAll('.demo-tab');
  tabs.forEach(t => {
    if (t.dataset.lang === lang) {
      t.classList.add('active');
      // Scroll tab into view for mobile overflow layout (container-only scroll to prevent window jumping)
      const container = t.parentElement;
      if (container && window.innerWidth <= 768) {
        const tabLeft = t.offsetLeft;
        const tabWidth = t.offsetWidth;
        const containerWidth = container.offsetWidth;
        container.scrollTo({
          left: tabLeft - (containerWidth / 2) + (tabWidth / 2),
          behavior: 'smooth'
        });
      }
    } else {
      t.classList.remove('active');
    }
  });
  currentDemoLang = lang;
}

function playDemo(lang) {
  const data = DEMO_DATA[lang];
  if (!data) return;

  const chatBody = document.getElementById('demo-chat-body');
  const avatarEl = document.getElementById('demo-avatar');
  const nameEl = document.getElementById('demo-name');

  if (!chatBody) return;

  // Update user info
  if (avatarEl) avatarEl.textContent = data.avatar;
  if (nameEl) nameEl.textContent = data.name;

  // Clear and play animations
  chatBody.innerHTML = '';

  // Step 1: Add Client Message after 200ms
  const clientTimer = setTimeout(() => {
    const clientBubble = document.createElement('div');
    clientBubble.className = 'bubble client';
    clientBubble.dir = 'auto';
    clientBubble.innerHTML = `
      <span class="bubble-tag">Client</span>
      <div>${data.clientMsg}</div>
      <span class="bubble-time">Received</span>
    `;
    chatBody.appendChild(clientBubble);
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 200);

  // Step 2: Show Typing Indicator after 1200ms
  const typingTimer = setTimeout(() => {
    const typingBubble = document.createElement('div');
    typingBubble.className = 'bubble typing';
    typingBubble.id = 'demo-typing-indicator';
    typingBubble.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    chatBody.appendChild(typingBubble);
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 1200);

  // Step 3: Show AI reply after 2700ms (1.5s typing)
  const replyTimer = setTimeout(() => {
    // Remove typing bubble
    const typingInd = document.getElementById('demo-typing-indicator');
    if (typingInd) typingInd.remove();

    const aiBubble = document.createElement('div');
    aiBubble.className = 'bubble ai';
    aiBubble.dir = 'auto';
    aiBubble.innerHTML = `
      <span class="bubble-tag">${data.replyBadge}</span>
      <div>${data.aiReply}</div>
      <span class="bubble-time">Sent Automatically</span>
    `;
    chatBody.appendChild(aiBubble);
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 2700);

  // Store timers on the element to cancel them if tab changes mid-animation
  // This prevents overlapping text/animations from previous plays
  if (chatBody._timers) {
    chatBody._timers.forEach(t => clearTimeout(t));
  }
  chatBody._timers = [clientTimer, typingTimer, replyTimer];
}

function startDemoCycle() {
  if (demoAutoCycleRunning) return;
  demoAutoCycleRunning = true;

  const langs = ['ja', 'ko', 'es', 'fr', 'ar', 'tl'];
  let idx = langs.indexOf(currentDemoLang);
  if (idx === -1) idx = 0;

  // Play current demo
  setActiveTab(currentDemoLang);
  playDemo(currentDemoLang);

  demoTimer = setInterval(() => {
    idx = (idx + 1) % langs.length;
    currentDemoLang = langs[idx];
    setActiveTab(currentDemoLang);
    playDemo(currentDemoLang);
  }, 8000);
}

function stopDemoCycle() {
  demoAutoCycleRunning = false;
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
  }
  const chatBody = document.getElementById('demo-chat-body');
  if (chatBody && chatBody._timers) {
    chatBody._timers.forEach(t => clearTimeout(t));
    chatBody._timers = [];
  }
}

function initDemoPlayground() {
  const tabs = document.querySelectorAll('.demo-tab');
  if (!tabs.length) return;

  // Click handler
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const lang = tab.dataset.lang;
      if (!lang) return;
      
      // Stop auto cycling
      stopDemoCycle();
      
      setActiveTab(lang);
      playDemo(lang);
    });
  });
}

// ===== Nav Scroll Shadow =====
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// ===== Public Feedback Form Submission =====
document.getElementById('form-feedback')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('feedback-error');
  const succEl = document.getElementById('feedback-success');
  const name = document.getElementById('feedback-name').value;
  const email = document.getElementById('feedback-email').value;
  const message = document.getElementById('feedback-message').value;

  if (errEl) errEl.classList.add('hidden');
  if (succEl) succEl.classList.add('hidden');

  // Profanity check
  if (checkFormProfanity(name, message)) {
    if (errEl) {
      errEl.textContent = 'Inappropriate language detected. Please remove offensive words.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  try {
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending...';
    }

    const recaptchaToken = await getRecaptchaToken('feedback');
    await api('/feedback', {
      method: 'POST',
      body: JSON.stringify({ name, email, message, recaptchaToken })
    });
    
    document.getElementById('feedback-name').value = '';
    document.getElementById('feedback-email').value = '';
    document.getElementById('feedback-message').value = '';

    if (succEl) {
      succEl.textContent = 'Feedback sent successfully! Thank you for sharing your thoughts. ✅';
      succEl.classList.remove('hidden');
    }

    setTimeout(() => {
      document.getElementById('feedback-modal')?.classList.add('hidden');
      if (succEl) succEl.classList.add('hidden');
    }, 2000);
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || 'Failed to send feedback.';
      errEl.classList.remove('hidden');
    }
  } finally {
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Send Message';
    }
  }
});

// ===== Animated Network Background (disabled) =====
// Background network and running lights removed for a cleaner look.

// ===== Init =====
(async () => {
  try {
    const hash = window.location.hash.replace('#', '');
    const publicPages = ['login', 'register'];
    const landingSections = ['features', 'languages', 'how', 'pricing', 'faq'];

    // Handle landing section hashes on load to prevent native jump and do smooth scroll instead
    let targetSection = null;
    if (landingSections.includes(hash)) {
      const el = document.getElementById(hash);
      if (el) {
        targetSection = el;
        // Temporarily change ID to prevent browser instant scroll
        el.id = `temp-scroll-${hash}`;
      }
    }

    if (token) {
      try {
        await api('/stats');
        enterDashboard();
      } catch (e) {
        token = '';
        localStorage.removeItem('kk_token');
        sessionStorage.removeItem('kk_token');
        // If hash points to a public page, go there; otherwise landing
        if (publicPages.includes(hash)) {
          showPage(hash, false);
        } else {
          showPage('landing');
          const modalId = HASH_TO_MODAL[hash];
          if (modalId) {
            openModal(modalId, false);
          }
        }
      }
    } else if (publicPages.includes(hash)) {
      // Restore public page from hash (e.g. #register after refresh)
      showPage(hash, false);
    } else {
      showPage('landing');
      const modalId = HASH_TO_MODAL[hash];
      if (modalId) {
        openModal(modalId, false);
      }
    }

    // Smoothly scroll to target section if it was intercepted
    if (targetSection) {
      setTimeout(() => {
        // Restore original ID
        targetSection.id = hash;
        if (currentPage === 'landing') {
          targetSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 200);
    }
  } catch (e) {
    console.error('Init error:', e);
    showPage('landing');
  }
})();

/* ====================================================
   Premium Hero Carousel & Slide Animation Controller
   ==================================================== */
(function initHeroCarousel() {
  const container = document.getElementById('hero-carousel');
  const track = document.getElementById('carousel-track');
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.carousel-dot');
  const btnPrev = document.getElementById('carousel-prev');
  const btnNext = document.getElementById('carousel-next');

  if (!container || !track || slides.length === 0) return;

  let currentSlide = 0;
  let autoPlayTimer = null;
  let isHovered = false;

  // Slide transition controller
  function goToSlide(index) {
    // Wrap around boundaries
    let nextIndex = index;
    if (index >= slides.length) nextIndex = 0;
    if (index < 0) nextIndex = slides.length - 1;

    // Deactivate current slide animations
    stopSlideAnimations(currentSlide);

    currentSlide = nextIndex;

    // Update active states
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === currentSlide);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });

    // Start current active slide animations
    startSlideAnimations(currentSlide);

    // Reset auto-play timer
    resetAutoPlay();
  }

  // Auto-play methods
  function startAutoPlay() {
    stopAutoPlay();
    autoPlayTimer = setInterval(() => {
      if (!isHovered) {
        goToSlide(currentSlide + 1);
      }
    }, 7000); // 7 seconds per slide
  }

  function stopAutoPlay() {
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
    }
  }

  function resetAutoPlay() {
    startAutoPlay();
  }

  // Hover detection to pause transition
  container.addEventListener('mouseenter', () => {
    isHovered = true;
  });

  container.addEventListener('mouseleave', () => {
    isHovered = false;
  });

  // Action listeners for buttons & dots
  if (btnPrev) {
    btnPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(currentSlide - 1);
    });
  }
  
  if (btnNext) {
    btnNext.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(currentSlide + 1);
    });
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(i);
    });
  });

  /* ====================================================
     Slide-Specific Animations (Triggered on Active State)
     ==================================================== */

  // Slide 1: Animated Inbox Mockup Loop
  let inboxLoopTimeout = null;
  let inboxLoopActive = false;

  const emails = [
    { name: 'Liam Henderson', initials: 'LH', subject: 'Urgent: Project Proposal & Design Rates', time: '4:30 PM' },
    { name: 'Kristine Lim', initials: 'KL', subject: 'GCash payment receipt for Order #5982', time: '3:15 PM' },
    { name: 'Yuki Tanaka', initials: 'YT', subject: 'ウェブサイトの料金を教えてください', time: '2:08 PM' },
    { name: 'Dr. Sophia Reynolds', initials: 'SR', subject: 'Consultation Booking & AI Strategy Package', time: '1:45 PM' },
    { name: 'Carlos Rivera', initials: 'CR', subject: 'Brand Collaboration & Affiliate Proposal', time: '11:30 AM' },
  ];

  const emailContainer = document.getElementById('mockup-emails');
  const badge = document.getElementById('mockup-badge');
  const aiText = document.getElementById('mockup-ai-text');
  const aiDots = document.getElementById('mockup-ai-dots');

  let cycle = 0;

  function createEmailEl(email, delay) {
    const el = document.createElement('div');
    el.className = 'mockup-email';
    el.style.animationDelay = delay + 'ms';
    el.innerHTML = `
      <div class="mockup-avatar">${email.initials}</div>
      <div class="mockup-email-body">
        <div class="mockup-email-name">${email.name}</div>
        <div class="mockup-email-subject">${email.subject}</div>
        <div class="mockup-typing-row">
          <div class="mockup-typing-bubble">
            <span></span><span></span><span></span>
          </div>
          <span class="mockup-typing-label">AI drafting...</span>
        </div>
        <div class="mockup-replied-badge">Replied ✓</div>
      </div>
      <div class="mockup-email-time">${email.time}</div>
      <div class="mockup-email-status">✓</div>
    `;
    return el;
  }

  async function sleep(ms) {
    return new Promise(r => {
      inboxLoopTimeout = setTimeout(r, ms);
    });
  }

  async function runInboxCycle() {
    if (!inboxLoopActive || !emailContainer || !badge || !aiText || !aiDots) return;

    // Clear previous emails
    emailContainer.innerHTML = '';
    badge.textContent = '0 new';
    badge.classList.remove('has-new');
    aiText.textContent = 'AutoInbox Active';
    aiDots.classList.remove('active');

    // Pick 4 emails for this cycle
    const start = (cycle * 4) % emails.length;
    const batch = [];
    for (let i = 0; i < 4; i++) {
      batch.push(emails[(start + i) % emails.length]);
    }

    // Slide in emails
    for (let i = 0; i < batch.length; i++) {
      if (!inboxLoopActive) return;
      const el = createEmailEl(batch[i], 0);
      emailContainer.appendChild(el);
      badge.textContent = (i + 1) + ' new';
      badge.classList.add('has-new');
      await sleep(700);
    }

    await sleep(800);

    // AI drafting & replying
    const emailEls = emailContainer.querySelectorAll('.mockup-email');
    for (let i = 0; i < emailEls.length; i++) {
      if (!inboxLoopActive) return;
      const el = emailEls[i];

      el.classList.add('replying');
      aiText.textContent = 'Drafting reply to ' + batch[i].name + '...';
      aiDots.classList.add('active');

      await sleep(1600);
      if (!inboxLoopActive) return;

      el.classList.remove('replying');
      el.classList.add('replied');
      const statusIcon = el.querySelector('.mockup-email-status');
      if (statusIcon) statusIcon.classList.add('show');
      aiDots.classList.remove('active');
      aiText.textContent = 'Reply sent ✓';

      await sleep(600);
    }

    aiText.textContent = 'All replies sent ✓';
    badge.textContent = '0 new';
    badge.classList.remove('has-new');

    await sleep(2000);
    if (!inboxLoopActive) return;

    emailEls.forEach((el, i) => {
      el.style.transition = 'opacity 0.4s ease ' + (i * 0.1) + 's, transform 0.4s ease ' + (i * 0.1) + 's';
      el.style.opacity = '0';
      el.style.transform = 'translateX(-30px)';
    });

    await sleep(1200);
    if (!inboxLoopActive) return;

    cycle++;
    runInboxCycle();
  }

  function startInboxMockup() {
    inboxLoopActive = true;
    runInboxCycle();
  }

  function stopInboxMockup() {
    inboxLoopActive = false;
    if (inboxLoopTimeout) {
      clearTimeout(inboxLoopTimeout);
      inboxLoopTimeout = null;
    }
  }

  // Slide 3: Language highlight chips loop
  let langHighlightInterval = null;
  let langHighlightIndex = 0;
  
  function startLangChipsAnimation() {
    const chips = document.querySelectorAll('#slide-languages .lang-chip');
    if (chips.length === 0) return;
    
    // Clear interval just in case
    if (langHighlightInterval) clearInterval(langHighlightInterval);

    // Initial state setup
    chips.forEach((c, idx) => c.classList.toggle('highlight', idx === 1)); // Default Japanese highlighted
    langHighlightIndex = 1;

    langHighlightInterval = setInterval(() => {
      langHighlightIndex = (langHighlightIndex + 1) % chips.length;
      chips.forEach((c, idx) => {
        c.classList.toggle('highlight', idx === langHighlightIndex);
      });
      
      const origFlag = document.querySelector('#slide-languages .lang-card:not(.reply) .lang-flag');
      const origMsg = document.querySelector('#slide-languages .lang-card:not(.reply) .lang-message');
      const replyMsg = document.querySelector('#slide-languages .lang-card.reply .lang-message');
      const senderName = document.querySelector('#slide-languages .lang-sender');

      if (langHighlightIndex === 0) { // US/English
        if (senderName) senderName.innerHTML = '<span class="lang-avatar">LH</span> Liam Henderson';
        if (origFlag) origFlag.textContent = '🇺🇸 USA';
        if (origMsg) origMsg.textContent = 'Hey! Do you have the pricing brochure for the Premium Plan?';
        if (replyMsg) replyMsg.textContent = 'Hi Liam, yes! You can find our pricing and details at...';
      } else if (langHighlightIndex === 1) { // Japanese
        if (senderName) senderName.innerHTML = '<span class="lang-avatar">YT</span> Yuki Tanaka';
        if (origFlag) origFlag.textContent = '🇯🇵 Japan';
        if (origMsg) origMsg.textContent = 'ウェブサイトの制作料金を教えてもらえますか？';
        if (replyMsg) replyMsg.textContent = '田中様、お問い合わせありがとうございます。制作料金は...';
      } else if (langHighlightIndex === 2) { // Spanish
        if (senderName) senderName.innerHTML = '<span class="lang-avatar">CR</span> Carlos Rivera';
        if (origFlag) origFlag.textContent = '🇪🇸 Spain';
        if (origMsg) origMsg.textContent = '¿Me puede enviar la información de precios de su servicio?';
        if (replyMsg) replyMsg.textContent = 'Hola Carlos, gracias por contactarnos. Los precios son...';
      } else if (langHighlightIndex === 3) { // Filipino
        if (senderName) senderName.innerHTML = '<span class="lang-avatar">KL</span> Kristine Lim';
        if (origFlag) origFlag.textContent = '🇵🇭 PH';
        if (origMsg) origMsg.textContent = 'Magkano po ang inyong monthly at annual plans para sa SaaS?';
        if (replyMsg) replyMsg.textContent = 'Hi Kristine! Ang aming monthly plan ay nagsisimula sa...';
      }
    }, 2500);
  }

  function stopLangChipsAnimation() {
    if (langHighlightInterval) {
      clearInterval(langHighlightInterval);
      langHighlightInterval = null;
    }
  }

  // Animation trigger router
  function startSlideAnimations(index) {
    if (index === 0) {
      startInboxMockup();
    } else if (index === 2) {
      startLangChipsAnimation();
    }
  }

  function stopSlideAnimations(index) {
    if (index === 0) {
      stopInboxMockup();
    } else if (index === 2) {
      stopLangChipsAnimation();
    }
  }

  // Start initial processes
  startSlideAnimations(0);
  startAutoPlay();
})();

// ===== Scroll-Triggered Animations =====
(function initScrollAnimations() {
  // Timeline steps staggered reveal
  const timelineObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        timelineObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.timeline-step').forEach(el => timelineObs.observe(el));

  // Feature cards cascade
  const cascadeObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        cascadeObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.feat-card, .step-card, .testi-card, .bva-card, .faq-item').forEach(el => {
    el.classList.add('cascade-item');
    cascadeObs.observe(el);
  });

  // Stat number count-up animation
  const statObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const final = parseInt(el.textContent) || 0;
        if (final <= 0) return;
        el.setAttribute('data-animate', 'true');
        let current = 0;
        const step = Math.max(1, Math.ceil(final / 30));
        const timer = setInterval(() => {
          current += step;
          if (current >= final) { current = final; clearInterval(timer); }
          el.textContent = current.toLocaleString();
        }, 30);
        statObs.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-num').forEach(el => statObs.observe(el));

  // Section reveal for landing page sections
  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        sectionObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.lp-section').forEach(el => {
    el.classList.add('section-reveal');
    sectionObs.observe(el);
  });

  // Scroll progress bar calculation
  window.addEventListener('scroll', () => {
    if (currentPage === 'landing') {
      const scrollBar = document.getElementById('scroll-progress-bar');
      if (scrollBar) {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        scrollBar.style.width = percent + '%';
      }
    }
  });
})();


// ===== Inline Redesign Custom Integrations =====
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit to ensure elements are fully initialized or bind directly
  setTimeout(() => {
    document.getElementById('inline-price-free')?.addEventListener('click', (e) => {
      e.preventDefault();
      showPage('register');
    });
    document.getElementById('inline-price-basic')?.addEventListener('click', (e) => {
      e.preventDefault();
      showPage('register');
    });
    document.getElementById('inline-price-pro')?.addEventListener('click', (e) => {
      e.preventDefault();
      showPage('register');
    });
  }, 1000);
});

// Inline Feedback Form Submission
document.getElementById('form-feedback-inline')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('feedback-error-inline');
  const succEl = document.getElementById('feedback-success-inline');
  const name = document.getElementById('feedback-name-inline').value;
  const email = document.getElementById('feedback-email-inline').value;
  const message = document.getElementById('feedback-message-inline').value;

  if (errEl) errEl.classList.add('hidden');
  if (succEl) succEl.classList.add('hidden');

  if (checkFormProfanity(name, message)) {
    if (errEl) {
      errEl.textContent = 'Inappropriate language detected. Please remove offensive words.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  try {
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending...';
    }

    const recaptchaToken = await getRecaptchaToken('feedback');
    await api('/feedback', {
      method: 'POST',
      body: JSON.stringify({ name, email, message, recaptchaToken })
    });
    
    document.getElementById('feedback-name-inline').value = '';
    document.getElementById('feedback-email-inline').value = '';
    document.getElementById('feedback-message-inline').value = '';

    if (succEl) {
      succEl.textContent = 'Feedback sent successfully! Thank you for sharing your thoughts. ✅';
      succEl.classList.remove('hidden');
    }
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || 'Failed to send feedback.';
      errEl.classList.remove('hidden');
    }
  } finally {
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Send Message';
    }
  }
});


// ===== Audio UI Synthesized Sound Effects =====
const AudioUI = {
  ctx: null,
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  },
  playClick() {
    this.init();
    if (!this.ctx || this.ctx.state === 'suspended') return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.06);
    
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  },
  playHover() {
    this.init();
    if (!this.ctx || this.ctx.state === 'suspended') return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }
};

// Bind audio triggers to UI
document.addEventListener('DOMContentLoaded', () => {
  const resumeAudio = () => {
    AudioUI.init();
    if (AudioUI.ctx && AudioUI.ctx.state === 'suspended') {
      AudioUI.ctx.resume();
    }
  };
  document.body.addEventListener('click', resumeAudio, { once: true });
  document.body.addEventListener('touchstart', resumeAudio, { once: true });

  const bindUIListeners = () => {
    document.querySelectorAll('.menu-item, .nav-pill-item, .lang-switcher-option, .lang-switcher-dropdown button').forEach(el => {
      el.removeEventListener('mouseenter', AudioUI.playHover);
      el.addEventListener('mouseenter', AudioUI.playHover);
    });

    document.querySelectorAll('.btn-accent, .btn-ghost, .outer-login-btn, .outer-connect-btn, .canvas-contact-btn, .canvas-download-btn, .menu-item, .nav-pill-item, .pass-toggle, .social-btn, .mnav-item, .inline-price-signup, .inline-price-trial, .inline-price-pro').forEach(el => {
      el.removeEventListener('click', AudioUI.playClick);
      el.addEventListener('click', AudioUI.playClick);
    });
  };
  
  bindUIListeners();
  
  // Re-bind when language switcher is toggled
  document.getElementById('lang-switcher-btn')?.addEventListener('click', () => {
    setTimeout(bindUIListeners, 200);
  });
});


// ===== Canvas Particle Network Motion Graphics =====
(function() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  
  const particles = [];
  const mouse = { x: null, y: null, radius: 150 };
  
  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });
  
  const container = document.getElementById('page-landing');
  if (container) {
    container.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    container.addEventListener('mouseleave', () => {
      mouse.x = null;
      mouse.y = null;
    });
  }
  
  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = Math.random() * 2 + 1;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
    }
    
    draw() {
      ctx.fillStyle = 'rgba(0, 158, 204, 0.25)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
    
    update() {
      this.x += this.vx;
      this.y += this.vy;
      
      if (this.x < 0 || this.x > width) this.vx = -this.vx;
      if (this.y < 0 || this.y > height) this.vy = -this.vy;
      
      if (mouse.x != null && mouse.y != null) {
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius) {
          let force = (mouse.radius - distance) / mouse.radius;
          let directionX = dx / distance;
          let directionY = dy / distance;
          this.x -= directionX * force * 2;
          this.y -= directionY * force * 2;
        }
      }
    }
  }
  
  const particleCount = Math.min(60, Math.floor((width * height) / 20000));
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
  
  function animate() {
    const landing = document.getElementById('page-landing');
    if (landing && !landing.classList.contains('hidden')) {
      ctx.clearRect(0, 0, width, height);
      
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          let dx = particles[a].x - particles[b].x;
          let dy = particles[a].y - particles[b].y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 120) {
            let alpha = (120 - distance) / 120 * 0.15;
            ctx.strokeStyle = `rgba(0, 158, 204, ${alpha * 1.5})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
      
      particles.forEach(p => {
        p.update();
        p.draw();
      });
    }
    requestAnimationFrame(animate);
  }
  
  animate();
})();


// ===== Scroll Reveal Intersection Observer =====
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('.landing-section, .feat-card, .timeline-step, .price-card, .testi-card');
    
    sections.forEach(el => el.classList.add('reveal-fade'));
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: '0px 0px -30px 0px'
    });
    
    sections.forEach(sec => observer.observe(sec));
  });
})();

// Track cursor on bento cards for gradient movement
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.feat-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
    });
  });
});
