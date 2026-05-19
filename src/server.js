require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const { register, login, requireAuth } = require('./auth');
const { initAI, generateDraft } = require('./ai/agent');
const { initVoiceAI, analyzeVoice, getVoiceProfile } = require('./ai/voice-clone');
const { encrypt } = require('./crypto');
const emailMonitor = require('./monitors/email');
const emailSender = require('./senders/email');
const { helmetConfig, apiLimiter, authLimiter } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmetConfig);
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// --- Health Check (keep-alive) ---
app.get('/health', (req, res) => res.status(200).json({ status: 'alive', uptime: process.uptime() }));

// --- Auth Routes (public) ---
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const result = await register(email, password, name);
    res.json({ success: true, token: result.token, userId: result.userId });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.json({ success: true, token: result.token, name: result.name });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

// --- PayMongo Plans ---
const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY;
const PLANS = {
  basic: { name: 'AutoInbox Basic', amount: 500, description: '200 AI replies/mo, Full voice clone, Priority AI' },
  pro: { name: 'AutoInbox Pro', amount: 1000, description: 'Unlimited AI replies, 3 Gmail accounts, Fastest AI' }
};

// --- PayMongo Webhook (public, no auth needed) ---
app.post('/api/webhook/paymongo', (req, res) => {
  try {
    const event = req.body;
    const type = event?.data?.attributes?.type;
    console.log(`📦 PayMongo webhook: ${type}`);

    if (type === 'checkout_session.payment.paid') {
      const session = event.data.attributes.data;
      const metadata = session?.attributes?.metadata;
      if (metadata?.user_id && metadata?.plan) {
        const userId = parseInt(metadata.user_id);
        const plan = metadata.plan;
        const paymentId = session?.attributes?.payments?.[0]?.id || 'paid';
        db.setUserPlan(userId, plan, session.id, paymentId, PLANS[plan]?.amount || 0);
        console.log(`✅ User ${userId} upgraded to ${plan}`);
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    res.json({ received: true });
  }
});

// --- Protected Routes ---
app.use('/api', requireAuth);
app.use('/api', apiLimiter);

// --- Email Config ---
app.post('/api/email/connect', async (req, res) => {
  try {
    const { email_address, email_password, imap_host, imap_port, smtp_host, smtp_port } = req.body;
    if (!email_address || !email_password) return res.status(400).json({ error: 'Email and password required' });

    const config = {
      imap_host: imap_host || 'imap.gmail.com', imap_port: imap_port || 993,
      smtp_host: smtp_host || 'smtp.gmail.com', smtp_port: smtp_port || 587,
      email_address, email_password_enc: encrypt(email_password), is_active: true
    };

    db.setEmailConfig(req.userId, config);
    emailMonitor.startForUser(req.userId, config).catch(e => console.error(e));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/email/disconnect', async (req, res) => {
  try {
    await emailMonitor.stopForUser(req.userId);
    const config = db.getEmailConfig(req.userId);
    if (config) db.setEmailConfig(req.userId, { ...config, is_active: false });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/email/status', (req, res) => {
  const config = db.getEmailConfig(req.userId);
  const monitor = emailMonitor.getUserStatus(req.userId);
  res.json({ configured: !!config, email: config?.email_address || null, connected: monitor.connected, active: !!config?.is_active });
});

// --- Messages ---
app.get('/api/messages', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const messages = db.getMessagesByUser(req.userId, limit, offset);
    const total = db.getMessageCount(req.userId);
    res.json({ messages, total: total?.count || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages/:id', (req, res) => {
  try {
    const msg = db.getMessageById(parseInt(req.params.id), req.userId);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    const draft = db.getDraftByMessageId(msg.id, req.userId);
    res.json({ message: msg, draft });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/messages/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    db.updateMessageStatus('approved', id, req.userId);
    const result = await emailSender.sendReply(id, req.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/messages/:id/edit', (req, res) => {
  try {
    const draft = db.getDraftByMessageId(parseInt(req.params.id), req.userId);
    if (!draft) return res.status(404).json({ error: 'No draft' });
    db.updateDraftContent(req.body.content, draft.id, req.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/messages/:id/reject', (req, res) => {
  try {
    db.updateMessageStatus('rejected', parseInt(req.params.id), req.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/messages/:id/regenerate', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const msg = db.getMessageById(id, req.userId);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    db.updateMessageStatus('drafting', id, req.userId);
    const draft = await generateDraft(req.userId, msg);
    const existing = db.getDraftByMessageId(id, req.userId);
    db.insertDraft({ message_id: id, user_id: req.userId, content: draft.content, version: (existing?.version || 0) + 1 });
    db.updateMessageStatus('drafted', id, req.userId);
    res.json({ success: true, draft: draft.content });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Voice Clone ---
app.post('/api/voice/samples', (req, res) => {
  try {
    const { samples } = req.body;
    if (!samples || !Array.isArray(samples)) return res.status(400).json({ error: 'Samples array required' });
    db.clearVoiceSamples(req.userId);
    samples.forEach(s => { if (s.trim()) db.addVoiceSample(req.userId, s.trim()); });
    res.json({ success: true, count: samples.filter(s => s.trim()).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/voice/analyze', async (req, res) => {
  try {
    const result = await analyzeVoice(req.userId);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/voice/profile', (req, res) => {
  const profile = getVoiceProfile(req.userId);
  const samples = db.getVoiceSamples(req.userId);
  res.json({ profile, sampleCount: samples.length });
});

// --- Settings ---
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.getAllSettings(req.userId);
    const result = {};
    settings.forEach(s => { if (s.key !== 'voice_profile') result[s.key] = s.value; });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      db.upsertSetting(req.userId, key, String(value));
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Stats ---
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats(req.userId);
    stats.email = emailMonitor.getUserStatus(req.userId);
    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Plan ---
app.get('/api/plan', (req, res) => {
  try {
    const plan = db.getUserPlan(req.userId);
    res.json(plan);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- PayMongo Checkout ---
app.post('/api/checkout', async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

    if (!PAYMONGO_SECRET) return res.status(500).json({ error: 'Payment system not configured' });

    const p = PLANS[plan];
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET + ':').toString('base64')}`
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [{
              name: p.name,
              amount: p.amount,
              currency: 'USD',
              quantity: 1
            }],
            payment_method_types: ['card', 'gcash', 'grab_pay'],
            description: p.description,
            send_email_receipt: true,
            success_url: `${req.protocol}://${req.get('host')}/?payment=success&plan=${plan}`,
            cancel_url: `${req.protocol}://${req.get('host')}/?payment=cancelled`,
            metadata: {
              user_id: String(req.userId),
              plan: plan
            }
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('PayMongo error:', JSON.stringify(data));
      return res.status(400).json({ error: data.errors?.[0]?.detail || 'Checkout failed' });
    }

    const checkoutId = data.data.id;
    const checkoutUrl = data.data.attributes.checkout_url;

    // Save pending subscription
    db.setUserPlan(req.userId, plan, checkoutId, null, p.amount);

    res.json({ checkout_url: checkoutUrl, checkout_id: checkoutId });
  } catch (e) {
    console.error('Checkout error:', e);
    res.status(500).json({ error: e.message });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// --- Start ---
async function start() {
  await db.initDB();
  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     🤖  AutoInbox SaaS — Running!        ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`   App: http://localhost:${PORT}`);
    console.log('');
    initAI();
    initVoiceAI();
    emailMonitor.startAllActive();

    // Keep-alive self-ping every 14 minutes (prevents Render free tier sleep)
    if (process.env.RENDER) {
      const PING_URL = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'autoinbox.onrender.com'}/health`;
      setInterval(() => {
        require('https').get(PING_URL, (r) => console.log(`🏓 Keep-alive ping: ${r.statusCode}`)).on('error', () => {});
      }, 14 * 60 * 1000); // 14 minutes
      console.log('   🏓 Keep-alive enabled (every 14 min)');
    }
  });
}

start().catch(e => { console.error('❌ Start failed:', e); process.exit(1); });

process.on('SIGINT', () => { db.closeDB(); process.exit(0); });
