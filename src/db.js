const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Global mock state
let isMock = false;
const mockDbPath = path.join(__dirname, '..', 'data', 'db.json');
let mockData = {
  users: [],
  user_email_config: [],
  messages: [],
  drafts: [],
  sent_replies: [],
  settings: [],
  voice_samples: [],
  subscriptions: []
};

function loadMockData() {
  if (fs.existsSync(mockDbPath)) {
    try {
      mockData = JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
    } catch (e) {
      console.error('⚠️ Error reading mock DB file, initializing empty:', e);
    }
  } else {
    saveMockData();
  }
}

function saveMockData() {
  try {
    const dir = path.dirname(mockDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(mockDbPath, JSON.stringify(mockData, null, 2), 'utf8');
  } catch (e) {
    console.error('⚠️ Error writing mock DB file:', e);
  }
}

// Parse Supabase DATABASE_URL and connect via pooler
function buildPoolConfig() {
  const url = process.env.DATABASE_URL || '';
  
  // Parse: postgresql://postgres:PASS@db.PROJECTREF.supabase.co:5432/postgres
  const match = url.match(/postgresql:\/\/postgres:(.+)@db\.(.+)\.supabase\.co:5432\/postgres/);
  
  if (match) {
    const password = match[1];
    const projectRef = match[2];
    console.log(`🔄 Supabase project: ${projectRef} — connecting via pooler`);
    return {
      user: `postgres.${projectRef}`,
      password: password,
      host: `aws-1-ap-northeast-1.pooler.supabase.com`,
      port: 5432,
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    };
  }
  
  // Fallback: use URL as-is
  return {
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  };
}

const pool = new Pool(buildPoolConfig());

async function initDB() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await client.query(`CREATE TABLE IF NOT EXISTS user_email_config (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
        imap_host TEXT, imap_port INTEGER DEFAULT 993,
        smtp_host TEXT, smtp_port INTEGER DEFAULT 587,
        email_address TEXT,
        email_password_enc TEXT,
        is_active INTEGER DEFAULT 0
      )`);

      await client.query(`CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        platform TEXT NOT NULL,
        external_id TEXT,
        sender_id TEXT NOT NULL,
        sender_name TEXT, sender_email TEXT,
        subject TEXT, body TEXT NOT NULL,
        raw_headers TEXT,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending'
      )`);

      await client.query(`CREATE TABLE IF NOT EXISTS drafts (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES messages(id),
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        edited_content TEXT,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await client.query(`CREATE TABLE IF NOT EXISTS sent_replies (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES messages(id),
        user_id INTEGER NOT NULL,
        draft_id INTEGER,
        content TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'sent', error TEXT
      )`);

      await client.query(`CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        UNIQUE(user_id, key)
      )`);

      await client.query(`CREATE TABLE IF NOT EXISTS voice_samples (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        sample_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await client.query(`CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        plan TEXT DEFAULT 'free',
        checkout_id TEXT,
        payment_id TEXT,
        amount INTEGER DEFAULT 0,
        currency TEXT DEFAULT 'PHP',
        status TEXT DEFAULT 'active',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )`);

      console.log('✅ PostgreSQL database initialized (Supabase)');
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn('⚠️ Could not connect to PostgreSQL database:', err.message);
    console.warn('🔄 Falling back to local JSON database (data/db.json) for development!');
    isMock = true;
    loadMockData();
  }
}

// --- Users ---
async function createUser(email, passwordHash, name) {
  if (isMock) {
    const userId = mockData.users.length + 1;
    mockData.users.push({
      id: userId,
      email,
      password_hash: passwordHash,
      name,
      created_at: new Date()
    });
    
    const defaults = {
      agent_name: name,
      agent_tone: 'professional-friendly',
      agent_language: 'en',
      auto_draft: 'true',
      services: '',
      custom_instructions: '',
      voice_profile: ''
    };
    for (const [k, v] of Object.entries(defaults)) {
      mockData.settings.push({
        id: mockData.settings.length + 1,
        user_id: userId,
        key: k,
        value: String(v)
      });
    }
    saveMockData();
    return userId;
  }

  const res = await pool.query("INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id", [email, passwordHash, name]);
  const userId = res.rows[0].id;
  const defaults = { agent_name: name, agent_tone: 'professional-friendly', agent_language: 'en', auto_draft: 'true', services: '', custom_instructions: '', voice_profile: '' };
  for (const [k, v] of Object.entries(defaults)) {
    await pool.query("INSERT INTO settings (user_id, key, value) VALUES ($1,$2,$3)", [userId, k, v]);
  }
  return userId;
}

async function getUserByEmail(email) {
  if (isMock) {
    return mockData.users.find(u => u.email === email) || null;
  }
  const r = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return r.rows[0] || null;
}

async function getUserById(id) {
  if (isMock) {
    return mockData.users.find(u => u.id === id) || null;
  }
  const r = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return r.rows[0] || null;
}

async function updateUserPassword(id, passwordHash) {
  if (isMock) {
    const user = mockData.users.find(u => u.id === id);
    if (user) {
      user.password_hash = passwordHash;
      saveMockData();
    }
    return;
  }
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, id]);
}


// --- Email Config ---
async function setEmailConfig(userId, config) {
  if (isMock) {
    const idx = mockData.user_email_config.findIndex(c => c.user_id === userId);
    const cfg = {
      user_id: userId,
      imap_host: config.imap_host,
      imap_port: config.imap_port,
      smtp_host: config.smtp_host,
      smtp_port: config.smtp_port,
      email_address: config.email_address,
      email_password_enc: config.email_password_enc,
      is_active: config.is_active ? 1 : 0
    };
    if (idx !== -1) {
      mockData.user_email_config[idx] = { ...mockData.user_email_config[idx], ...cfg };
    } else {
      mockData.user_email_config.push({
        id: mockData.user_email_config.length + 1,
        ...cfg
      });
    }
    saveMockData();
    return;
  }

  const existing = await pool.query("SELECT id FROM user_email_config WHERE user_id = $1", [userId]);
  if (existing.rows.length) {
    await pool.query("UPDATE user_email_config SET imap_host=$1, imap_port=$2, smtp_host=$3, smtp_port=$4, email_address=$5, email_password_enc=$6, is_active=$7 WHERE user_id=$8",
      [config.imap_host, config.imap_port, config.smtp_host, config.smtp_port, config.email_address, config.email_password_enc, config.is_active ? 1 : 0, userId]);
  } else {
    await pool.query("INSERT INTO user_email_config (user_id, imap_host, imap_port, smtp_host, smtp_port, email_address, email_password_enc, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [userId, config.imap_host, config.imap_port, config.smtp_host, config.smtp_port, config.email_address, config.email_password_enc, config.is_active ? 1 : 0]);
  }
}

async function getEmailConfig(userId) {
  if (isMock) {
    return mockData.user_email_config.find(c => c.user_id === userId) || null;
  }
  const r = await pool.query("SELECT * FROM user_email_config WHERE user_id = $1", [userId]);
  return r.rows[0] || null;
}

async function getActiveEmailConfigs() {
  if (isMock) {
    return mockData.user_email_config.filter(c => c.is_active === 1);
  }
  const r = await pool.query("SELECT * FROM user_email_config WHERE is_active = 1");
  return r.rows;
}

// --- Messages ---
async function insertMessage(d) {
  if (isMock) {
    const msgId = mockData.messages.length + 1;
    mockData.messages.push({
      id: msgId,
      user_id: d.user_id,
      platform: d.platform,
      external_id: d.external_id,
      sender_id: d.sender_id,
      sender_name: d.sender_name,
      sender_email: d.sender_email,
      subject: d.subject,
      body: d.body,
      raw_headers: d.raw_headers,
      received_at: new Date(),
      status: 'pending'
    });
    saveMockData();
    return { lastInsertRowid: msgId };
  }

  const r = await pool.query("INSERT INTO messages (user_id,platform,external_id,sender_id,sender_name,sender_email,subject,body,raw_headers) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
    [d.user_id, d.platform, d.external_id, d.sender_id, d.sender_name, d.sender_email, d.subject, d.body, d.raw_headers]);
  return { lastInsertRowid: r.rows[0].id };
}

async function getMessageById(id, userId) {
  if (isMock) {
    return mockData.messages.find(m => m.id === id && m.user_id === userId) || null;
  }
  const r = await pool.query("SELECT * FROM messages WHERE id=$1 AND user_id=$2", [id, userId]);
  return r.rows[0] || null;
}

async function getMessageByExternalId(extId, platform, userId) {
  if (isMock) {
    return mockData.messages.find(m => m.external_id === extId && m.platform === platform && m.user_id === userId) || null;
  }
  const r = await pool.query("SELECT * FROM messages WHERE external_id=$1 AND platform=$2 AND user_id=$3", [extId, platform, userId]);
  return r.rows[0] || null;
}

async function getMessagesByUser(userId, limit, offset) {
  if (isMock) {
    const userMsgs = mockData.messages
      .filter(m => m.user_id === userId)
      .sort((a, b) => new Date(b.received_at) - new Date(a.received_at));
    const paginated = userMsgs.slice(offset, offset + limit);
    return paginated.map(m => {
      const userDrafts = mockData.drafts.filter(d => d.message_id === m.id && d.user_id === m.user_id);
      const draft = userDrafts.sort((a, b) => b.version - a.version)[0] || null;
      return {
        ...m,
        draft_content: draft ? draft.content : null,
        edited_content: draft ? draft.edited_content : null,
        draft_id: draft ? draft.id : null
      };
    });
  }

  const r = await pool.query("SELECT m.*, d.content as draft_content, d.edited_content, d.id as draft_id FROM messages m LEFT JOIN drafts d ON d.message_id=m.id AND d.user_id=m.user_id WHERE m.user_id=$1 ORDER BY m.received_at DESC LIMIT $2 OFFSET $3", [userId, limit, offset]);
  return r.rows;
}

async function getMessageCount(userId) {
  if (isMock) {
    const count = mockData.messages.filter(m => m.user_id === userId).length;
    return { count };
  }
  const r = await pool.query("SELECT COUNT(*) as count FROM messages WHERE user_id=$1", [userId]);
  return r.rows[0] || { count: 0 };
}

async function updateMessageStatus(status, id, userId) {
  if (isMock) {
    const msg = mockData.messages.find(m => m.id === id && m.user_id === userId);
    if (msg) {
      msg.status = status;
      saveMockData();
    }
    return;
  }
  await pool.query("UPDATE messages SET status=$1 WHERE id=$2 AND user_id=$3", [status, id, userId]);
}

// --- Drafts ---
async function insertDraft(d) {
  if (isMock) {
    const draftId = mockData.drafts.length + 1;
    mockData.drafts.push({
      id: draftId,
      message_id: d.message_id,
      user_id: d.user_id,
      content: d.content,
      edited_content: null,
      version: d.version,
      created_at: new Date()
    });
    saveMockData();
    return;
  }
  await pool.query("INSERT INTO drafts (message_id, user_id, content, version) VALUES ($1,$2,$3,$4)", [d.message_id, d.user_id, d.content, d.version]);
}

async function getDraftByMessageId(msgId, userId) {
  if (isMock) {
    const ds = mockData.drafts.filter(d => d.message_id === msgId && d.user_id === userId);
    if (ds.length === 0) return null;
    return ds.sort((a, b) => b.version - a.version)[0];
  }
  const r = await pool.query("SELECT * FROM drafts WHERE message_id=$1 AND user_id=$2 ORDER BY version DESC LIMIT 1", [msgId, userId]);
  return r.rows[0] || null;
}

async function updateDraftContent(content, draftId, userId) {
  if (isMock) {
    const draft = mockData.drafts.find(d => d.id === draftId && d.user_id === userId);
    if (draft) {
      draft.edited_content = content;
      saveMockData();
    }
    return;
  }
  await pool.query("UPDATE drafts SET edited_content=$1 WHERE id=$2 AND user_id=$3", [content, draftId, userId]);
}

// --- Sent ---
async function insertSentReply(d) {
  if (isMock) {
    const replyId = mockData.sent_replies.length + 1;
    mockData.sent_replies.push({
      id: replyId,
      message_id: d.message_id,
      user_id: d.user_id,
      draft_id: d.draft_id,
      content: d.content,
      sent_at: new Date(),
      status: d.status,
      error: d.error
    });
    saveMockData();
    return;
  }
  await pool.query("INSERT INTO sent_replies (message_id,user_id,draft_id,content,status,error) VALUES ($1,$2,$3,$4,$5,$6)", [d.message_id, d.user_id, d.draft_id, d.content, d.status, d.error]);
}

// --- Settings ---
async function getSetting(userId, key) {
  if (isMock) {
    return mockData.settings.find(s => s.user_id === userId && s.key === key) || null;
  }
  const r = await pool.query("SELECT value FROM settings WHERE user_id=$1 AND key=$2", [userId, key]);
  return r.rows[0] || null;
}

async function upsertSetting(userId, key, value) {
  if (isMock) {
    const idx = mockData.settings.findIndex(s => s.user_id === userId && s.key === key);
    if (idx !== -1) {
      mockData.settings[idx].value = String(value);
    } else {
      mockData.settings.push({
        id: mockData.settings.length + 1,
        user_id: userId,
        key,
        value: String(value)
      });
    }
    saveMockData();
    return;
  }
  await pool.query("INSERT INTO settings (user_id,key,value) VALUES ($1,$2,$3) ON CONFLICT(user_id,key) DO UPDATE SET value=EXCLUDED.value", [userId, key, value]);
}

async function getAllSettings(userId) {
  if (isMock) {
    return mockData.settings.filter(s => s.user_id === userId);
  }
  const r = await pool.query("SELECT * FROM settings WHERE user_id=$1", [userId]);
  return r.rows;
}

// --- Voice Samples ---
async function addVoiceSample(userId, text) {
  if (isMock) {
    mockData.voice_samples.push({
      id: mockData.voice_samples.length + 1,
      user_id: userId,
      sample_text: text,
      created_at: new Date()
    });
    saveMockData();
    return;
  }
  await pool.query("INSERT INTO voice_samples (user_id, sample_text) VALUES ($1,$2)", [userId, text]);
}

async function getVoiceSamples(userId) {
  if (isMock) {
    return mockData.voice_samples
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  const r = await pool.query("SELECT * FROM voice_samples WHERE user_id=$1 ORDER BY created_at DESC", [userId]);
  return r.rows;
}

async function clearVoiceSamples(userId) {
  if (isMock) {
    mockData.voice_samples = mockData.voice_samples.filter(s => s.user_id !== userId);
    saveMockData();
    return;
  }
  await pool.query("DELETE FROM voice_samples WHERE user_id=$1", [userId]);
}

// --- Stats ---
async function getStats(userId) {
  if (isMock) {
    const msgs = mockData.messages.filter(m => m.user_id === userId);
    const total = msgs.length;
    const today = msgs.filter(m => {
      const d = new Date(m.received_at);
      return d.toDateString() === new Date().toDateString();
    }).length;
    
    const byStatus = {};
    msgs.forEach(m => {
      byStatus[m.status] = (byStatus[m.status] || 0) + 1;
    });
    
    return { total, today, byStatus };
  }

  const total = await pool.query("SELECT COUNT(*) as count FROM messages WHERE user_id=$1", [userId]);
  const byStatus = await pool.query("SELECT status, COUNT(*) as count FROM messages WHERE user_id=$1 GROUP BY status", [userId]);
  const today = await pool.query("SELECT COUNT(*) as count FROM messages WHERE user_id=$1 AND DATE(received_at)=CURRENT_DATE", [userId]);
  return {
    total: parseInt(total.rows[0]?.count) || 0,
    today: parseInt(today.rows[0]?.count) || 0,
    byStatus: Object.fromEntries((byStatus.rows || []).map(r => [r.status, parseInt(r.count)]))
  };
}

// --- Subscriptions ---
async function getUserPlan(userId) {
  if (isMock) {
    const subs = mockData.subscriptions
      .filter(s => s.user_id === userId && s.status === 'active')
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    return subs[0] || { plan: 'free', status: 'active' };
  }
  const r = await pool.query("SELECT * FROM subscriptions WHERE user_id=$1 AND status='active' ORDER BY started_at DESC LIMIT 1", [userId]);
  return r.rows[0] || { plan: 'free', status: 'active' };
}

async function setUserPlan(userId, plan, checkoutId, paymentId, amount) {
  if (isMock) {
    mockData.subscriptions.push({
      id: mockData.subscriptions.length + 1,
      user_id: userId,
      plan,
      checkout_id: checkoutId || null,
      payment_id: paymentId || null,
      amount: amount || 0,
      status: 'active',
      started_at: new Date()
    });
    saveMockData();
    return;
  }
  await pool.query("INSERT INTO subscriptions (user_id, plan, checkout_id, payment_id, amount, status) VALUES ($1,$2,$3,$4,$5,'active')",
    [userId, plan, checkoutId || null, paymentId || null, amount || 0]);
}

async function getSubByCheckoutId(checkoutId) {
  if (isMock) {
    return mockData.subscriptions.find(s => s.checkout_id === checkoutId) || null;
  }
  const r = await pool.query("SELECT * FROM subscriptions WHERE checkout_id=$1", [checkoutId]);
  return r.rows[0] || null;
}

async function getAdminStats() {
  if (isMock) {
    const totalUsers = mockData.users.length;
    const payingUserIds = new Set(
      mockData.subscriptions
        .filter(s => s.plan !== 'free' && s.status === 'active')
        .map(s => s.user_id)
    );
    const payingUsers = payingUserIds.size;
    const todaySignups = mockData.users.filter(u => {
      const d = new Date(u.created_at);
      return d.toDateString() === new Date().toDateString();
    }).length;
    const totalRevenue = mockData.subscriptions
      .filter(s => s.status === 'active' && s.plan !== 'free')
      .reduce((sum, s) => sum + s.amount, 0);
    const recentUsers = [...mockData.users]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(u => ({ id: u.id, name: u.name, email: u.email, created_at: u.created_at }));
      
    return {
      totalUsers,
      payingUsers,
      freeUsers: totalUsers - payingUsers,
      todaySignups,
      totalRevenue,
      recentUsers
    };
  }

  const totalUsers = await pool.query("SELECT COUNT(*) as count FROM users");
  const payingUsers = await pool.query("SELECT COUNT(DISTINCT user_id) as count FROM subscriptions WHERE plan != 'free' AND status = 'active'");
  const todaySignups = await pool.query("SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE");
  const totalRevenue = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM subscriptions WHERE status = 'active' AND plan != 'free'");
  const recentUsers = await pool.query("SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 10");
  
  return {
    totalUsers: parseInt(totalUsers.rows[0].count),
    payingUsers: parseInt(payingUsers.rows[0].count),
    freeUsers: parseInt(totalUsers.rows[0].count) - parseInt(payingUsers.rows[0].count),
    todaySignups: parseInt(todaySignups.rows[0].count),
    totalRevenue: parseInt(totalRevenue.rows[0].total),
    recentUsers: recentUsers.rows
  };
}

async function closeDB() {
  if (isMock) return;
  await pool.end();
}

module.exports = {
  initDB, closeDB,
  createUser, getUserByEmail, getUserById, updateUserPassword,
  setEmailConfig, getEmailConfig, getActiveEmailConfigs,
  insertMessage, getMessageById, getMessageByExternalId, getMessagesByUser, getMessageCount, updateMessageStatus,
  insertDraft, getDraftByMessageId, updateDraftContent, insertSentReply,
  getSetting, upsertSetting, getAllSettings,
  addVoiceSample, getVoiceSamples, clearVoiceSamples, getStats,
  getUserPlan, setUserPlan, getSubByCheckoutId, getAdminStats
};
