const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'kopyako.db');

let db = null;

async function initDB() {
  const SQL = await initSqlJs();
  try {
    if (fs.existsSync(dbPath)) {
      db = new SQL.Database(fs.readFileSync(dbPath));
    } else {
      db = new SQL.Database();
    }
  } catch (e) { db = new SQL.Database(); }

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_email_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    imap_host TEXT, imap_port INTEGER DEFAULT 993,
    smtp_host TEXT, smtp_port INTEGER DEFAULT 587,
    email_address TEXT,
    email_password_enc TEXT,
    is_active INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    external_id TEXT,
    sender_id TEXT NOT NULL,
    sender_name TEXT, sender_email TEXT,
    subject TEXT, body TEXT NOT NULL,
    raw_headers TEXT,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    edited_content TEXT,
    version INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sent_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    draft_id INTEGER,
    content TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'sent', error TEXT,
    FOREIGN KEY (message_id) REFERENCES messages(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE(user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS voice_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    sample_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  saveDB();
  console.log('✅ Database initialized');
}

function saveDB() {
  if (!db) return;
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function queryAll(sql, params = []) {
  const r = db.exec(sql, params);
  if (!r.length) return [];
  return r[0].values.map(row => {
    const obj = {};
    r[0].columns.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  });
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

// --- Users ---
function createUser(email, passwordHash, name) {
  db.run("INSERT INTO users (email, password_hash, name) VALUES (?,?,?)", [email, passwordHash, name]);
  const u = queryOne("SELECT last_insert_rowid() as id");
  // Default settings
  const defaults = { agent_name: name, agent_tone: 'professional-friendly', agent_language: 'en', auto_draft: 'true', services: '', custom_instructions: '', voice_profile: '' };
  for (const [k, v] of Object.entries(defaults)) {
    db.run("INSERT INTO settings (user_id, key, value) VALUES (?,?,?)", [u.id, k, v]);
  }
  saveDB();
  return u.id;
}
function getUserByEmail(email) { return queryOne("SELECT * FROM users WHERE email = ?", [email]); }
function getUserById(id) { return queryOne("SELECT * FROM users WHERE id = ?", [id]); }

// --- Email Config ---
function setEmailConfig(userId, config) {
  const existing = queryOne("SELECT id FROM user_email_config WHERE user_id = ?", [userId]);
  if (existing) {
    db.run("UPDATE user_email_config SET imap_host=?, imap_port=?, smtp_host=?, smtp_port=?, email_address=?, email_password_enc=?, is_active=? WHERE user_id=?",
      [config.imap_host, config.imap_port, config.smtp_host, config.smtp_port, config.email_address, config.email_password_enc, config.is_active ? 1 : 0, userId]);
  } else {
    db.run("INSERT INTO user_email_config (user_id, imap_host, imap_port, smtp_host, smtp_port, email_address, email_password_enc, is_active) VALUES (?,?,?,?,?,?,?,?)",
      [userId, config.imap_host, config.imap_port, config.smtp_host, config.smtp_port, config.email_address, config.email_password_enc, config.is_active ? 1 : 0]);
  }
  saveDB();
}
function getEmailConfig(userId) { return queryOne("SELECT * FROM user_email_config WHERE user_id = ?", [userId]); }
function getActiveEmailConfigs() { return queryAll("SELECT * FROM user_email_config WHERE is_active = 1"); }

// --- Messages ---
function insertMessage(d) {
  db.run("INSERT INTO messages (user_id,platform,external_id,sender_id,sender_name,sender_email,subject,body,raw_headers) VALUES (?,?,?,?,?,?,?,?,?)",
    [d.user_id, d.platform, d.external_id, d.sender_id, d.sender_name, d.sender_email, d.subject, d.body, d.raw_headers]);
  const r = queryOne("SELECT last_insert_rowid() as id");
  saveDB();
  return { lastInsertRowid: r.id };
}
function getMessageById(id, userId) { return queryOne("SELECT * FROM messages WHERE id=? AND user_id=?", [id, userId]); }
function getMessageByExternalId(extId, platform, userId) { return queryOne("SELECT * FROM messages WHERE external_id=? AND platform=? AND user_id=?", [extId, platform, userId]); }
function getAllMessages(userId, limit, offset) {
  return queryAll("SELECT m.*, d.content as draft_content, d.edited_content, d.id as draft_id FROM messages m LEFT JOIN drafts d ON d.message_id=m.id AND d.user_id=m.user_id ORDER BY m.received_at DESC LIMIT ? OFFSET ?", [limit, offset]);
}
function getMessagesByUser(userId, limit, offset) {
  return queryAll("SELECT m.*, d.content as draft_content, d.edited_content, d.id as draft_id FROM messages m LEFT JOIN drafts d ON d.message_id=m.id AND d.user_id=m.user_id WHERE m.user_id=? ORDER BY m.received_at DESC LIMIT ? OFFSET ?", [userId, limit, offset]);
}
function getMessageCount(userId) { return queryOne("SELECT COUNT(*) as count FROM messages WHERE user_id=?", [userId]); }
function updateMessageStatus(status, id, userId) { run("UPDATE messages SET status=? WHERE id=? AND user_id=?", [status, id, userId]); }

// --- Drafts ---
function insertDraft(d) { run("INSERT INTO drafts (message_id, user_id, content, version) VALUES (?,?,?,?)", [d.message_id, d.user_id, d.content, d.version]); }
function getDraftByMessageId(msgId, userId) { return queryOne("SELECT * FROM drafts WHERE message_id=? AND user_id=? ORDER BY version DESC LIMIT 1", [msgId, userId]); }
function updateDraftContent(content, draftId, userId) { run("UPDATE drafts SET edited_content=? WHERE id=? AND user_id=?", [content, draftId, userId]); }

// --- Sent ---
function insertSentReply(d) { run("INSERT INTO sent_replies (message_id,user_id,draft_id,content,status,error) VALUES (?,?,?,?,?,?)", [d.message_id, d.user_id, d.draft_id, d.content, d.status, d.error]); }

// --- Settings ---
function getSetting(userId, key) { return queryOne("SELECT value FROM settings WHERE user_id=? AND key=?", [userId, key]); }
function upsertSetting(userId, key, value) {
  run("INSERT INTO settings (user_id,key,value) VALUES (?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value", [userId, key, value]);
}
function getAllSettings(userId) { return queryAll("SELECT * FROM settings WHERE user_id=?", [userId]); }

// --- Voice Samples ---
function addVoiceSample(userId, text) { run("INSERT INTO voice_samples (user_id, sample_text) VALUES (?,?)", [userId, text]); }
function getVoiceSamples(userId) { return queryAll("SELECT * FROM voice_samples WHERE user_id=? ORDER BY created_at DESC", [userId]); }
function clearVoiceSamples(userId) { run("DELETE FROM voice_samples WHERE user_id=?", [userId]); }

// --- Stats ---
function getStats(userId) {
  const total = queryOne("SELECT COUNT(*) as count FROM messages WHERE user_id=?", [userId]);
  const byStatus = queryAll("SELECT status, COUNT(*) as count FROM messages WHERE user_id=? GROUP BY status", [userId]);
  const today = queryOne("SELECT COUNT(*) as count FROM messages WHERE user_id=? AND date(received_at)=date('now')", [userId]);
  return {
    total: total?.count || 0, today: today?.count || 0,
    byStatus: Object.fromEntries((byStatus || []).map(r => [r.status, r.count]))
  };
}

function closeDB() { if (db) { saveDB(); db.close(); } }

module.exports = {
  initDB, closeDB,
  createUser, getUserByEmail, getUserById,
  setEmailConfig, getEmailConfig, getActiveEmailConfigs,
  insertMessage, getMessageById, getMessageByExternalId, getMessagesByUser, getMessageCount, updateMessageStatus,
  insertDraft, getDraftByMessageId, updateDraftContent, insertSentReply,
  getSetting, upsertSetting, getAllSettings,
  addVoiceSample, getVoiceSamples, clearVoiceSamples, getStats
};
