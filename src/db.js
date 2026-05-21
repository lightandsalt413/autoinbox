const { Pool } = require('pg');

// Auto-convert Supabase direct URL to pooler URL (fixes IPv6 ENETUNREACH from Render)
function getConnectionString() {
  let url = process.env.DATABASE_URL || '';
  // Direct: postgresql://postgres:PASS@db.PROJECTREF.supabase.co:5432/postgres
  // Pooler: postgresql://postgres.PROJECTREF:PASS@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
  const match = url.match(/postgresql:\/\/postgres:(.+)@db\.(.+)\.supabase\.co:5432\/postgres/);
  if (match) {
    const password = encodeURIComponent(match[1]);
    const projectRef = match[2];
    url = `postgresql://postgres.${projectRef}:${password}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`;
    console.log('🔄 Converted to Supabase connection pooler URL (session mode)');
  }
  return url;
}

const pool = new Pool({
  connectionString: getConnectionString(),
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
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
}

// --- Users ---
async function createUser(email, passwordHash, name) {
  const res = await pool.query("INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id", [email, passwordHash, name]);
  const userId = res.rows[0].id;
  const defaults = { agent_name: name, agent_tone: 'professional-friendly', agent_language: 'en', auto_draft: 'true', services: '', custom_instructions: '', voice_profile: '' };
  for (const [k, v] of Object.entries(defaults)) {
    await pool.query("INSERT INTO settings (user_id, key, value) VALUES ($1,$2,$3)", [userId, k, v]);
  }
  return userId;
}
async function getUserByEmail(email) { const r = await pool.query("SELECT * FROM users WHERE email = $1", [email]); return r.rows[0] || null; }
async function getUserById(id) { const r = await pool.query("SELECT * FROM users WHERE id = $1", [id]); return r.rows[0] || null; }

// --- Email Config ---
async function setEmailConfig(userId, config) {
  const existing = await pool.query("SELECT id FROM user_email_config WHERE user_id = $1", [userId]);
  if (existing.rows.length) {
    await pool.query("UPDATE user_email_config SET imap_host=$1, imap_port=$2, smtp_host=$3, smtp_port=$4, email_address=$5, email_password_enc=$6, is_active=$7 WHERE user_id=$8",
      [config.imap_host, config.imap_port, config.smtp_host, config.smtp_port, config.email_address, config.email_password_enc, config.is_active ? 1 : 0, userId]);
  } else {
    await pool.query("INSERT INTO user_email_config (user_id, imap_host, imap_port, smtp_host, smtp_port, email_address, email_password_enc, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [userId, config.imap_host, config.imap_port, config.smtp_host, config.smtp_port, config.email_address, config.email_password_enc, config.is_active ? 1 : 0]);
  }
}
async function getEmailConfig(userId) { const r = await pool.query("SELECT * FROM user_email_config WHERE user_id = $1", [userId]); return r.rows[0] || null; }
async function getActiveEmailConfigs() { const r = await pool.query("SELECT * FROM user_email_config WHERE is_active = 1"); return r.rows; }

// --- Messages ---
async function insertMessage(d) {
  const r = await pool.query("INSERT INTO messages (user_id,platform,external_id,sender_id,sender_name,sender_email,subject,body,raw_headers) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
    [d.user_id, d.platform, d.external_id, d.sender_id, d.sender_name, d.sender_email, d.subject, d.body, d.raw_headers]);
  return { lastInsertRowid: r.rows[0].id };
}
async function getMessageById(id, userId) { const r = await pool.query("SELECT * FROM messages WHERE id=$1 AND user_id=$2", [id, userId]); return r.rows[0] || null; }
async function getMessageByExternalId(extId, platform, userId) { const r = await pool.query("SELECT * FROM messages WHERE external_id=$1 AND platform=$2 AND user_id=$3", [extId, platform, userId]); return r.rows[0] || null; }
async function getMessagesByUser(userId, limit, offset) {
  const r = await pool.query("SELECT m.*, d.content as draft_content, d.edited_content, d.id as draft_id FROM messages m LEFT JOIN drafts d ON d.message_id=m.id AND d.user_id=m.user_id WHERE m.user_id=$1 ORDER BY m.received_at DESC LIMIT $2 OFFSET $3", [userId, limit, offset]);
  return r.rows;
}
async function getMessageCount(userId) { const r = await pool.query("SELECT COUNT(*) as count FROM messages WHERE user_id=$1", [userId]); return r.rows[0] || { count: 0 }; }
async function updateMessageStatus(status, id, userId) { await pool.query("UPDATE messages SET status=$1 WHERE id=$2 AND user_id=$3", [status, id, userId]); }

// --- Drafts ---
async function insertDraft(d) { await pool.query("INSERT INTO drafts (message_id, user_id, content, version) VALUES ($1,$2,$3,$4)", [d.message_id, d.user_id, d.content, d.version]); }
async function getDraftByMessageId(msgId, userId) { const r = await pool.query("SELECT * FROM drafts WHERE message_id=$1 AND user_id=$2 ORDER BY version DESC LIMIT 1", [msgId, userId]); return r.rows[0] || null; }
async function updateDraftContent(content, draftId, userId) { await pool.query("UPDATE drafts SET edited_content=$1 WHERE id=$2 AND user_id=$3", [content, draftId, userId]); }

// --- Sent ---
async function insertSentReply(d) { await pool.query("INSERT INTO sent_replies (message_id,user_id,draft_id,content,status,error) VALUES ($1,$2,$3,$4,$5,$6)", [d.message_id, d.user_id, d.draft_id, d.content, d.status, d.error]); }

// --- Settings ---
async function getSetting(userId, key) { const r = await pool.query("SELECT value FROM settings WHERE user_id=$1 AND key=$2", [userId, key]); return r.rows[0] || null; }
async function upsertSetting(userId, key, value) {
  await pool.query("INSERT INTO settings (user_id,key,value) VALUES ($1,$2,$3) ON CONFLICT(user_id,key) DO UPDATE SET value=EXCLUDED.value", [userId, key, value]);
}
async function getAllSettings(userId) { const r = await pool.query("SELECT * FROM settings WHERE user_id=$1", [userId]); return r.rows; }

// --- Voice Samples ---
async function addVoiceSample(userId, text) { await pool.query("INSERT INTO voice_samples (user_id, sample_text) VALUES ($1,$2)", [userId, text]); }
async function getVoiceSamples(userId) { const r = await pool.query("SELECT * FROM voice_samples WHERE user_id=$1 ORDER BY created_at DESC", [userId]); return r.rows; }
async function clearVoiceSamples(userId) { await pool.query("DELETE FROM voice_samples WHERE user_id=$1", [userId]); }

// --- Stats ---
async function getStats(userId) {
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
  const r = await pool.query("SELECT * FROM subscriptions WHERE user_id=$1 AND status='active' ORDER BY started_at DESC LIMIT 1", [userId]);
  return r.rows[0] || { plan: 'free', status: 'active' };
}
async function setUserPlan(userId, plan, checkoutId, paymentId, amount) {
  await pool.query("INSERT INTO subscriptions (user_id, plan, checkout_id, payment_id, amount, status) VALUES ($1,$2,$3,$4,$5,'active')",
    [userId, plan, checkoutId || null, paymentId || null, amount || 0]);
}
async function getSubByCheckoutId(checkoutId) {
  const r = await pool.query("SELECT * FROM subscriptions WHERE checkout_id=$1", [checkoutId]);
  return r.rows[0] || null;
}

async function closeDB() { await pool.end(); }

module.exports = {
  initDB, closeDB,
  createUser, getUserByEmail, getUserById,
  setEmailConfig, getEmailConfig, getActiveEmailConfigs,
  insertMessage, getMessageById, getMessageByExternalId, getMessagesByUser, getMessageCount, updateMessageStatus,
  insertDraft, getDraftByMessageId, updateDraftContent, insertSentReply,
  getSetting, upsertSetting, getAllSettings,
  addVoiceSample, getVoiceSamples, clearVoiceSamples, getStats,
  getUserPlan, setUserPlan, getSubByCheckoutId
};
