// ===== State =====
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
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
  'menu-languages': 'languages-modal',
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

// ===== API =====
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`/api${path}`, { ...opts, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (e) { throw e; }
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
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
});

// ===== Navigation =====
let currentPage = null;
function showPage(id, addHistory = true) {
  closeLandingModals();
  closeGuideModal();
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const el = document.getElementById(`page-${id}`);
  if (el) {
    el.classList.remove('hidden');
    // Re-trigger fade animation
    el.style.animation = 'none';
    el.offsetHeight; // force reflow
    el.style.animation = '';
  }
  if (addHistory && id !== 'landing') {
    if (currentPage === id) {
      history.replaceState({ page: id }, '', `#${id}`);
    } else {
      history.pushState({ page: id }, '', `#${id}`);
    }
  } else if (addHistory && id === 'landing') {
    // If there was a modal hash, keep it clean
    const currentHash = window.location.hash.replace('#', '');
    if (HASH_TO_MODAL[currentHash]) {
      history.replaceState(null, '', window.location.pathname);
    } else if (!currentHash) {
      history.replaceState(null, '', window.location.pathname);
    }
  }
  currentPage = id;
  window.scrollTo({ top: 0 });
  if (id === 'landing' && typeof checkRevealFallback === 'function') {
    setTimeout(checkRevealFallback, 100);
  }
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
  document.querySelector(`[data-page="${id}"]`)?.classList.add('active');
}

// ===== Auth =====
document.getElementById('btn-goto-login')?.addEventListener('click', () => showPage('login'));
document.getElementById('btn-goto-register')?.addEventListener('click', () => showPage('register'));
document.getElementById('btn-hero-start')?.addEventListener('click', () => showPage('register'));
document.getElementById('btn-how-signup')?.addEventListener('click', () => showPage('register'));
document.getElementById('link-register')?.addEventListener('click', (e) => { e.preventDefault(); showPage('register'); });
document.getElementById('link-login')?.addEventListener('click', (e) => { e.preventDefault(); showPage('login'); });
document.getElementById('logo-home')?.addEventListener('click', (e) => { e.preventDefault(); showPage('landing'); window.scrollTo({top:0,behavior:'smooth'}); });
document.getElementById('login-back-home')?.addEventListener('click', (e) => { e.preventDefault(); showPage('landing'); window.scrollTo({top:0,behavior:'smooth'}); });
document.getElementById('register-back-home')?.addEventListener('click', (e) => { e.preventDefault(); showPage('landing'); window.scrollTo({top:0,behavior:'smooth'}); });

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

document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const inMenuState = history.state && history.state.menuOpen;
    if (menuPanel) {
      menuPanel.classList.remove('open');
    }
    const id = item.id;
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
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: document.getElementById('login-email').value, password: document.getElementById('login-pass').value })
    });
    token = data.token;
    const rememberMe = document.getElementById('remember-me')?.checked;
    if (rememberMe) {
      localStorage.setItem('kk_token', token);
      if (data.name) localStorage.setItem('autoinbox_name', data.name);
    } else {
      sessionStorage.setItem('kk_token', token);
      if (data.name) sessionStorage.setItem('autoinbox_name', data.name);
    }
    enterDashboard();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
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
// Show/Hide Password Toggles
document.getElementById('toggle-pass')?.addEventListener('click', function() {
  const inp = document.getElementById('reg-pass');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  this.textContent = show ? 'Hide' : 'Show';
});
document.getElementById('toggle-pass-confirm')?.addEventListener('click', function() {
  const inp = document.getElementById('reg-pass-confirm');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  this.textContent = show ? 'Hide' : 'Show';
});
document.getElementById('toggle-login-pass')?.addEventListener('click', function() {
  const inp = document.getElementById('login-pass');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  this.textContent = show ? 'Hide' : 'Show';
});

document.getElementById('form-register')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('reg-error');
  errEl.classList.add('hidden');
  const pass = document.getElementById('reg-pass').value;
  const confirmPass = document.getElementById('reg-pass-confirm').value;
  const agree = document.getElementById('reg-agree');
  // Validate confirm password
  if (pass !== confirmPass) {
    errEl.textContent = 'Passwords do not match.';
    errEl.classList.remove('hidden');
    return;
  }
  // Validate terms checkbox
  if (!agree.checked) {
    errEl.textContent = 'Please agree to the Terms of Service and Privacy Policy.';
    errEl.classList.remove('hidden');
    return;
  }
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: [
          document.getElementById('reg-fname').value.trim(),
          document.getElementById('reg-mname').value.trim(),
          document.getElementById('reg-lname').value.trim(),
          document.getElementById('reg-suffix').value.trim()
        ].filter(Boolean).join(' '),
        email: document.getElementById('reg-email').value,
        password: pass
      })
    });
    token = data.token;
    localStorage.setItem('kk_token', token);
    showPage('onboard');
    initOnboarding();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
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
  // Set user name in sidebar
  const userName = localStorage.getItem('autoinbox_name');
  if (userName) {
    const userEl = document.getElementById('sidebar-user');
    if (userEl) userEl.textContent = userName;
  }
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => { loadMessages(); loadStats(); loadEmailStatus(); }, 10000);
}

async function checkAdmin() {
  try {
    const data = await api('/admin/stats');
    // If we get here, user is admin
    document.getElementById('nav-admin')?.classList.remove('hidden');
    window._isAdmin = true;
    window._adminData = data;
  } catch (e) {
    // Not admin — hide button
    document.getElementById('nav-admin')?.classList.add('hidden');
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
    document.getElementById('admin-revenue').textContent = '\u20b1' + data.totalRevenue.toLocaleString();
    
    const tbody = document.getElementById('admin-users-body');
    if (tbody && data.recentUsers.length) {
      tbody.innerHTML = data.recentUsers.map((u, i) => 
        `<tr><td>${i+1}</td><td>${u.name}</td><td>${u.email}</td><td>${new Date(u.created_at).toLocaleDateString()}</td></tr>`
      ).join('');
    } else if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" style="color:var(--t3)">No users yet</td></tr>';
    }

    const fTbody = document.getElementById('admin-feedback-body');
    if (fTbody && data.recentFeedback && data.recentFeedback.length) {
      fTbody.innerHTML = data.recentFeedback.map((f, i) => 
        `<tr><td>${i+1}</td><td>${f.name || 'Anonymous'}</td><td>${f.email}</td><td style="white-space:pre-wrap;max-width:300px">${f.message}</td><td>${new Date(f.created_at).toLocaleDateString()}</td></tr>`
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

    // Highlight current plan
    document.querySelectorAll('.plan-option').forEach(o => o.classList.remove('current'));
    const currentEl = document.getElementById(`po-${plan}`);
    if (currentEl) {
      currentEl.classList.add('current');
      const btn = currentEl.querySelector('button');
      if (btn) { btn.textContent = 'Current Plan'; btn.disabled = true; btn.className = 'btn-ghost btn-full'; }
    }

    // Enable upgrade buttons for non-current plans
    ['basic', 'pro'].forEach(p => {
      if (p !== plan) {
        const el = document.getElementById(`po-${p}`);
        if (el) {
          const btn = el.querySelector('button');
          if (btn) {
            btn.disabled = false;
            btn.className = 'btn-accent btn-full';
            btn.textContent = p === 'basic' ? 'Start 7-Day Free Trial' : 'Subscribe Now';
          }
        }
      }
    });
    if (plan !== 'free') {
      const freeEl = document.getElementById('po-free');
      if (freeEl) {
        const btn = freeEl.querySelector('button');
        if (btn) { btn.textContent = 'Downgrade'; btn.disabled = true; btn.className = 'btn-ghost btn-full'; }
      }
    }
  } catch (e) { /* silent */ }
}

// Upgrade handlers
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

document.getElementById('btn-upgrade-basic')?.addEventListener('click', () => handleUpgrade('basic'));
document.getElementById('btn-upgrade-pro')?.addEventListener('click', () => handleUpgrade('pro'));

// ===== Messages =====
function escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

function timeAgo(ts) {
  if (!ts) return '';
  const diff = (Date.now() - new Date(ts + 'Z').getTime()) / 1000;
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
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
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
document.querySelector('.modal-bg')?.addEventListener('click', () => {
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
  try {
    await api('/settings', { method: 'POST', body: JSON.stringify({
      agent_name: document.getElementById('set-name').value,
      agent_tone: document.getElementById('set-tone').value,
      agent_language: document.getElementById('set-lang').value,
      services: document.getElementById('set-services').value,
      custom_instructions: document.getElementById('set-custom').value
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

// ===== Mobile Bottom Nav =====
document.querySelectorAll('.mnav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    showDashSection(page);
    document.querySelectorAll('.mnav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (page === 'voice') loadVoicePage();
    if (page === 'settings') loadSettings();
  });
});

// Pricing button handlers are in the Checkout section below
['btn-final-cta'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', () => showPage('register'));
});

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

// ===== Ambient Floating Orbs =====
(function initOrbs() {
  const c = document.getElementById('particles');
  if (!c) return;
  const ctx = c.getContext('2d');
  let w, h, orbs = [];
  function resize() { w = c.width = window.innerWidth; h = c.height = window.innerHeight; }
  window.addEventListener('resize', resize); resize();
  for (let i = 0; i < 40; i++) orbs.push({
    x: Math.random() * w, y: Math.random() * h,
    r: Math.random() * 2 + 1, vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3, phase: Math.random() * Math.PI * 2
  });
  function draw() {
    ctx.clearRect(0, 0, w, h);
    orbs.forEach((o, i) => {
      o.x += o.vx; o.y += o.vy; o.phase += 0.008;
      if (o.x < -10) o.x = w + 10; if (o.x > w + 10) o.x = -10;
      if (o.y < -10) o.y = h + 10; if (o.y > h + 10) o.y = -10;
      const glow = 0.15 + Math.sin(o.phase) * 0.1;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(197,165,90,${glow})`;
      ctx.fill();
      for (let j = i + 1; j < orbs.length; j++) {
        const dx = o.x - orbs[j].x, dy = o.y - orbs[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(orbs[j].x, orbs[j].y);
          ctx.strokeStyle = `rgba(197,165,90,${0.04 * (1 - d / 120)})`;
          ctx.stroke();
        }
      }
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ===== PWA Install =====
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });

// ===== Service Worker =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

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

  try {
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending...';
    }

    await api('/feedback', {
      method: 'POST',
      body: JSON.stringify({ name, email, message })
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

// ===== Animated Network Background with Running Lights =====
(function() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h;

  // Fixed nodes so lines don't move (like a static network)
  let nodes = [];
  let edges = [];
  let pulses = [];
  const NODE_COUNT = 80;
  const CONNECT_DIST = 200;

  function initNetwork() {
    nodes = [];
    edges = [];
    pulses = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1.5 + Math.random() * 2,
        hasEnvelope: Math.random() < 0.4 // 40% of nodes get an envelope
      });
    }
    // Build edges once (static lines)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          edges.push({ from: i, to: j, dist });
        }
      }
    }
  }

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    initNetwork();
  }

  // Spawn a light pulse on a random edge
  function spawnPulse() {
    if (edges.length === 0) return;
    const edge = edges[Math.floor(Math.random() * edges.length)];
    const reverse = Math.random() > 0.5;
    pulses.push({
      edge,
      t: 0,
      speed: 0.002 + Math.random() * 0.003, // VERY slow
      size: 2.5 + Math.random() * 2,
      reverse,
      trail: []
    });
  }

  function animate() {
    ctx.clearRect(0, 0, w, h);

    // Draw static lines (subtle gold)
    edges.forEach(e => {
      const a = nodes[e.from];
      const b = nodes[e.to];
      const opacity = (1 - e.dist / CONNECT_DIST) * 0.08;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(197,165,90,${opacity})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    // Draw nodes — envelopes or small dots
    nodes.forEach(n => {
      if (n.hasEnvelope) {
        // Draw envelope icon — properly aligned
        const s = 16 + n.r * 3; // width
        const eh = s * 0.65;    // height
        const ex = n.x - s / 2; // top-left x
        const ey = n.y - eh / 2; // top-left y (centered on node)

        ctx.strokeStyle = 'rgba(197,165,90,0.35)';
        ctx.lineWidth = 1.2;

        // Draw full envelope as one connected path
        ctx.beginPath();
        // Bottom-left → top-left → flap center → top-right → bottom-right → close
        ctx.moveTo(ex, ey + eh);
        ctx.lineTo(ex, ey);
        ctx.lineTo(n.x, ey + eh * 0.5);
        ctx.lineTo(ex + s, ey);
        ctx.lineTo(ex + s, ey + eh);
        ctx.closePath();
        ctx.stroke();

        // Bottom line of flap (connecting top corners straight)
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + s, ey);
        ctx.stroke();
      } else {
        // Small dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(197,165,90,0.12)';
        ctx.fill();
      }
    });

    // Spawn pulses slowly
    if (Math.random() < 0.03 && pulses.length < 12) {
      spawnPulse();
    }

    // Draw running light pulses on the lines
    pulses = pulses.filter(p => p.t <= 1);
    pulses.forEach(p => {
      p.t += p.speed;
      const a = nodes[p.edge.from];
      const b = nodes[p.edge.to];
      const progress = p.reverse ? 1 - p.t : p.t;
      const x = a.x + (b.x - a.x) * progress;
      const y = a.y + (b.y - a.y) * progress;

      // Store trail positions
      p.trail.push({ x, y });
      if (p.trail.length > 20) p.trail.shift();

      // Draw trail (fading line behind the pulse)
      for (let i = 1; i < p.trail.length; i++) {
        const fade = i / p.trail.length;
        ctx.beginPath();
        ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
        ctx.lineTo(p.trail[i].x, p.trail[i].y);
        ctx.strokeStyle = `rgba(197,165,90,${fade * 0.3})`;
        ctx.lineWidth = fade * 2;
        ctx.stroke();
      }

      // Outer glow
      const grd = ctx.createRadialGradient(x, y, 0, x, y, p.size * 6);
      grd.addColorStop(0, 'rgba(197,165,90,0.25)');
      grd.addColorStop(0.4, 'rgba(197,165,90,0.08)');
      grd.addColorStop(1, 'rgba(197,165,90,0)');
      ctx.beginPath();
      ctx.arc(x, y, p.size * 6, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Bright center
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,220,130,0.7)';
      ctx.fill();

      // White core
      ctx.beginPath();
      ctx.arc(x, y, p.size * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();

      // Light up the line the pulse is on
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(197,165,90,${0.15 * (1 - p.t)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    requestAnimationFrame(animate);
  }

  resize();
  window.addEventListener('resize', resize);
  animate();
})();

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
