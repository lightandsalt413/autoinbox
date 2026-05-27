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
const { profanityMiddleware } = require('./middleware/profanity');
const nodemailer = require('nodemailer');

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
app.post('/api/auth/register', authLimiter, profanityMiddleware, async (req, res) => {
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

// --- Public Feedback Route ---
app.post('/api/feedback', profanityMiddleware, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!email || !message) {
      return res.status(400).json({ error: 'Email and message are required.' });
    }
    const result = await db.insertFeedback(name, email, message);

    // Send email notification if SMTP is configured
    if (process.env.SYSTEM_EMAIL_USER && process.env.SYSTEM_EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SYSTEM_EMAIL_USER,
          pass: process.env.SYSTEM_EMAIL_PASS
        }
      });

      const mailOptions = {
        from: `"${name || 'Anonymous client'}" <${process.env.SYSTEM_EMAIL_USER}>`,
        to: process.env.NOTIFICATION_EMAIL || process.env.SYSTEM_EMAIL_USER,
        replyTo: email,
        subject: `📩 New Client Review/Feedback from ${name || 'Anonymous'}`,
        text: `You have received a new review/feedback on AutoInbox:\n\n` +
              `Name: ${name || 'Anonymous'}\n` +
              `Email: ${email}\n` +
              `Message:\n${message}\n\n` +
              `You can review and manage this feedback inside the AutoInbox Admin Dashboard.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #fafafa; color: #1a1a1c;">
            <h2 style="color: #1a1a1c; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-top: 0;">📩 New Feedback/Review</h2>
            <p><strong>Name:</strong> ${name || 'Anonymous'}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-style: italic; color: #333; white-space: pre-wrap;">${message}</div>
            <p style="font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
              This notification was sent automatically by AutoInbox. Manage feedback in your Admin Dashboard.
            </p>
          </div>
        `
      };

      transporter.sendMail(mailOptions).catch(err => {
        console.error('Failed to send feedback notification email:', err);
      });
    }

    res.json({ success: true, id: result.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
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

    let detectedImapHost = imap_host;
    let detectedImapPort = imap_port;
    let detectedSmtpHost = smtp_host;
    let detectedSmtpPort = smtp_port;

    if (!detectedImapHost) {
      const domain = email_address.split('@')[1]?.toLowerCase();
      const isYahoo = domain && (domain === 'yahoo.com' || domain.endsWith('.yahoo.com') || domain === 'ymail.com');
      if (isYahoo) {
        detectedImapHost = 'imap.mail.yahoo.com';
        detectedImapPort = 993;
        detectedSmtpHost = 'smtp.mail.yahoo.com';
        detectedSmtpPort = 587;
      } else {
        detectedImapHost = 'imap.gmail.com';
        detectedImapPort = 993;
        detectedSmtpHost = 'smtp.gmail.com';
        detectedSmtpPort = 587;
      }
    }

    const config = {
      imap_host: detectedImapHost,
      imap_port: detectedImapPort || 993,
      smtp_host: detectedSmtpHost,
      smtp_port: detectedSmtpPort || 587,
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

app.post('/api/messages/:id/edit', profanityMiddleware, async (req, res) => {
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
app.post('/api/voice/samples', profanityMiddleware, async (req, res) => {
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

app.post('/api/settings', profanityMiddleware, async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await db.upsertSetting(req.userId, key, String(value));
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Change Password ---
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await db.getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const SALT_ROUNDS = 12;
    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.updateUserPassword(req.userId, newHash);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Email Connection Test ---
app.post('/api/email/test', async (req, res) => {
  try {
    const config = await db.getEmailConfig(req.userId);
    if (!config) {
      return res.status(400).json({ error: 'Email connection not configured' });
    }

    const { decrypt } = require('./crypto');
    const password = decrypt(config.email_password_enc);

    // 1. Test IMAP Connection
    const { ImapFlow } = require('imapflow');
    const imapClient = new ImapFlow({
      host: config.imap_host || 'imap.gmail.com',
      port: config.imap_port || 993,
      secure: true,
      auth: { user: config.email_address, pass: password },
      logger: false
    });

    let imapSuccess = false;
    let imapError = null;
    try {
      await imapClient.connect();
      await imapClient.mailboxOpen('INBOX');
      imapSuccess = true;
      await imapClient.logout();
    } catch (err) {
      imapError = err.message;
    }

    // 2. Test SMTP Connection
    const nodemailer = require('nodemailer');
    const smtpTransporter = nodemailer.createTransport({
      host: config.smtp_host || 'smtp.gmail.com',
      port: config.smtp_port || 587,
      secure: (config.smtp_port || 587) === 465,
      auth: { user: config.email_address, pass: password }
    });

    let smtpSuccess = false;
    let smtpError = null;
    try {
      await smtpTransporter.verify();
      smtpSuccess = true;
    } catch (err) {
      smtpError = err.message;
    }

    if (imapSuccess && smtpSuccess) {
      res.json({ success: true, message: 'Both IMAP and SMTP connections are healthy! ✅' });
    } else {
      let errorDetails = [];
      if (!imapSuccess) errorDetails.push(`IMAP failed: ${imapError}`);
      if (!smtpSuccess) errorDetails.push(`SMTP failed: ${smtpError}`);
      res.status(400).json({
        error: errorDetails.join(' | '),
        imap: imapSuccess ? 'healthy' : imapError,
        smtp: smtpSuccess ? 'healthy' : smtpError
      });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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
