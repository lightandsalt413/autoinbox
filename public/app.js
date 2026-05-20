// ===== State =====
let token = localStorage.getItem('kk_token') || '';
let currentFilter = 'all';
let currentMsgId = null;
let refreshTimer = null;

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

// ===== Navigation =====
function showPage(id, addHistory = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${id}`).classList.remove('hidden');
  if (addHistory && id !== 'landing') {
    history.pushState({ page: id }, '', `#${id}`);
  }
}

// Back button → go to landing
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.page) {
    showPage(e.state.page, false);
  } else {
    showPage('landing', false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

// ===== Menu Dropdown =====
const menuTrigger = document.getElementById('menu-trigger');
const menuPanel = document.getElementById('menu-panel');

menuTrigger?.addEventListener('click', (e) => {
  e.stopPropagation();
  menuPanel.classList.toggle('open');
});

document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', () => {
    menuPanel.classList.remove('open');
  });
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu-dropdown')) {
    menuPanel?.classList.remove('open');
  }
});

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
    localStorage.setItem('kk_token', token);
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
        name: document.getElementById('reg-name').value,
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
  token = '';
  localStorage.removeItem('kk_token');
  if (refreshTimer) clearInterval(refreshTimer);
  showPage('landing');
});

// ===== Onboarding =====
let obStep = 1;

function initOnboarding() {
  obStep = 1;
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
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => { loadMessages(); loadStats(); loadEmailStatus(); }, 10000);
}

// Sidebar nav
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    showDashSection(page);
    if (page === 'voice') loadVoicePage();
    if (page === 'settings') loadSettings();
  });
});

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

// ===== Smooth Scroll for Nav Links =====
document.querySelectorAll('.nav-center a').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
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
      window.location.href = data.checkout_url;
    }
  } catch (e) {
    showToast(e.message || 'Checkout failed', 'error');
  }
}

document.getElementById('price-free')?.addEventListener('click', () => {
  if (token) { enterDashboard(); }
  else { showPage('register'); }
});
document.getElementById('price-basic')?.addEventListener('click', () => startCheckout('basic'));
document.getElementById('price-pro')?.addEventListener('click', () => startCheckout('pro'));
document.getElementById('btn-final-cta')?.addEventListener('click', () => {
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

// ===== Init =====
(async () => {
  if (token) {
    try {
      await api('/stats');
      enterDashboard();
    } catch (e) {
      token = '';
      localStorage.removeItem('kk_token');
      showPage('landing');
    }
  } else {
    showPage('landing');
  }
})();

// ===== Scroll Reveal =====
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); revealObserver.unobserve(e.target); } });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.section, .cta-section').forEach(el => revealObserver.observe(el));

// ===== Nav Scroll Shadow =====
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

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
        hasEnvelope: Math.random() < 0.3 // 30% of nodes get an envelope
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
        // Draw envelope icon
        const s = 7 + n.r * 2; // envelope size
        const ex = n.x - s / 2;
        const ey = n.y - s * 0.35;
        const eh = s * 0.7;
        // Envelope body (rectangle)
        ctx.beginPath();
        ctx.rect(ex, ey, s, eh);
        ctx.strokeStyle = 'rgba(197,165,90,0.18)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // Envelope flap (V shape on top)
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(n.x, ey + eh * 0.5);
        ctx.lineTo(ex + s, ey);
        ctx.strokeStyle = 'rgba(197,165,90,0.18)';
        ctx.lineWidth = 0.8;
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
