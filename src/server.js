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

// --- Live Reload for Local Development ---
if (process.env.NODE_ENV !== 'production' && !process.env.RENDER) {
  const livereload = require('livereload');
  const connectLiveReload = require('connect-livereload');
  
  const liveReloadServer = livereload.createServer();
  liveReloadServer.watch(path.join(__dirname, '..', 'public'));
  liveReloadServer.watch(path.join(__dirname, '..', 'src'));
  
  app.use(connectLiveReload());
  
  // Refresh on start/reconnect
  liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
      liveReloadServer.refresh("/");
    }, 100);
  });
}

app.use(helmetConfig);
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.css') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
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
  basic: { name: 'AutoInbox Basic', amount: 49900, description: '200 AI replies/mo, Full voice clone, Priority AI', trial_days: 7 },
  pro: { name: 'AutoInbox Pro', amount: 99900, description: 'Unlimited AI replies, 3 Gmail accounts, Fastest AI', trial_days: 0 }
};

// --- PayMongo Webhook (public, no auth needed) ---
app.post('/api/webhook/paymongo', async (req, res) => {
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
        await db.setUserPlan(userId, plan, session.id, paymentId, PLANS[plan]?.amount || 0);
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

    await db.setEmailConfig(req.userId, config);
    emailMonitor.startForUser(req.userId, config).catch(e => console.error(e));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/email/disconnect', async (req, res) => {
  try {
    await emailMonitor.stopForUser(req.userId);
    const config = await db.getEmailConfig(req.userId);
    if (config) await db.setEmailConfig(req.userId, { ...config, is_active: false });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/email/status', async (req, res) => {
  const config = await db.getEmailConfig(req.userId);
  const monitor = emailMonitor.getUserStatus(req.userId);
  res.json({ configured: !!config, email: config?.email_address || null, connected: monitor.connected, active: !!config?.is_active });
});

// --- Messages ---
app.get('/api/messages', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const messages = await db.getMessagesByUser(req.userId, limit, offset);
    const total = await db.getMessageCount(req.userId);
    res.json({ messages, total: total?.count || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages/:id', async (req, res) => {
  try {
    const msg = await db.getMessageById(parseInt(req.params.id), req.userId);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    const draft = await db.getDraftByMessageId(msg.id, req.userId);
    res.json({ message: msg, draft });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/messages/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.updateMessageStatus('approved', id, req.userId);
    const result = await emailSender.sendReply(id, req.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/messages/:id/edit', async (req, res) => {
  try {
    const draft = await db.getDraftByMessageId(parseInt(req.params.id), req.userId);
    if (!draft) return res.status(404).json({ error: 'No draft' });
    await db.updateDraftContent(req.body.content, draft.id, req.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/messages/:id/reject', async (req, res) => {
  try {
    await db.updateMessageStatus('rejected', parseInt(req.params.id), req.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/messages/:id/regenerate', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const msg = await db.getMessageById(id, req.userId);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    await db.updateMessageStatus('drafting', id, req.userId);
    const draft = await generateDraft(req.userId, msg);
    const existing = await db.getDraftByMessageId(id, req.userId);
    await db.insertDraft({ message_id: id, user_id: req.userId, content: draft.content, version: (existing?.version || 0) + 1 });
    await db.updateMessageStatus('drafted', id, req.userId);
    res.json({ success: true, draft: draft.content });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Voice Clone ---
app.post('/api/voice/samples', async (req, res) => {
  try {
    const { samples } = req.body;
    if (!samples || !Array.isArray(samples)) return res.status(400).json({ error: 'Samples array required' });
    await db.clearVoiceSamples(req.userId);
    for (const s of samples) { if (s.trim()) await db.addVoiceSample(req.userId, s.trim()); }
    res.json({ success: true, count: samples.filter(s => s.trim()).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/voice/analyze', async (req, res) => {
  try {
    const result = await analyzeVoice(req.userId);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/voice/profile', async (req, res) => {
  const profile = await getVoiceProfile(req.userId);
  const samples = await db.getVoiceSamples(req.userId);
  res.json({ profile, sampleCount: samples.length });
});

// --- Settings ---
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getAllSettings(req.userId);
    const result = {};
    settings.forEach(s => { if (s.key !== 'voice_profile') result[s.key] = s.value; });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await db.upsertSetting(req.userId, key, String(value));
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Stats ---
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats(req.userId);
    stats.email = emailMonitor.getUserStatus(req.userId);
    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Admin Stats ---
app.get('/api/admin/stats', async (req, res) => {
  try {
    const user = await db.getUserById(req.userId);
    const adminEmail = process.env.ADMIN_EMAIL || '';
    if (!user || user.email !== adminEmail) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const stats = await db.getAdminStats();
    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Plan ---
app.get('/api/plan', async (req, res) => {
  try {
    const plan = await db.getUserPlan(req.userId);
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
              currency: 'PHP',
              quantity: 1
            }],
            payment_method_types: ['card', 'gcash', 'paymaya'],
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
    await db.setUserPlan(req.userId, plan, checkoutId, null, p.amount);

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

      // Auto-register PayMongo webhook
      if (PAYMONGO_SECRET) {
        const WEBHOOK_URL = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'autoinbox.onrender.com'}/api/webhook/paymongo`;
        (async () => {
          try {
            // Check existing webhooks first
            const listRes = await fetch('https://api.paymongo.com/v1/webhooks', {
              headers: { 'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET + ':').toString('base64')}` }
            });
            const listData = await listRes.json();
            const existing = listData?.data?.find(w => w.attributes.url === WEBHOOK_URL && w.attributes.status === 'enabled');

            if (existing) {
              console.log('   💳 PayMongo webhook already registered');
            } else {
              const createRes = await fetch('https://api.paymongo.com/v1/webhooks', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET + ':').toString('base64')}`
                },
                body: JSON.stringify({
                  data: {
                    attributes: {
                      url: WEBHOOK_URL,
                      events: ['checkout_session.payment.paid']
                    }
                  }
                })
              });
              const createData = await createRes.json();
              if (createRes.ok) {
                console.log('   💳 PayMongo webhook registered ✅');
              } else {
                console.error('   💳 PayMongo webhook error:', createData?.errors?.[0]?.detail || 'Unknown');
              }
            }
          } catch (e) {
            console.error('   💳 PayMongo webhook setup failed:', e.message);
          }
        })();
      }
    }
  });
}

start().catch(e => { console.error('❌ Start failed:', e); process.exit(1); });

process.on('SIGINT', async () => { await db.closeDB(); process.exit(0); });
