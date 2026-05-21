const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { insertMessage, getMessageByExternalId, updateMessageStatus, insertDraft, getSetting, getActiveEmailConfigs } = require('../db');
const { decrypt } = require('../crypto');
const { generateDraft } = require('../ai/agent');

const connections = new Map(); // userId -> { client, connected }

async function processEmail(parsed, userId, ownEmail) {
  try {
    const messageId = parsed.messageId || `email-${Date.now()}-${Math.random()}`;
    const from = parsed.from?.value?.[0] || {};
    if (from.address?.toLowerCase() === ownEmail?.toLowerCase()) return;
    if (await getMessageByExternalId(messageId, 'email', userId)) return;

    let body = parsed.text || '';
    if (!body && parsed.html) body = parsed.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (body.length > 5000) body = body.substring(0, 5000) + '\n[...truncated...]';
    if (!body) body = '(empty)';

    const result = await insertMessage({
      user_id: userId, platform: 'email', external_id: messageId,
      sender_id: from.address || 'unknown', sender_name: from.name || from.address || 'Unknown',
      sender_email: from.address || '', subject: parsed.subject || '(no subject)',
      body, raw_headers: JSON.stringify({ messageId: parsed.messageId, inReplyTo: parsed.inReplyTo, references: parsed.references })
    });

    const savedId = result.lastInsertRowid;
    console.log(`📧 [User ${userId}] New: ${from.name || from.address} — "${parsed.subject}"`);

    const autoDraft = (await getSetting(userId, 'auto_draft'))?.value;
    if (autoDraft === 'true') {
      await updateMessageStatus('drafting', savedId, userId);
      try {
        const draft = await generateDraft(userId, { platform: 'email', sender_name: from.name, sender_email: from.address, subject: parsed.subject, body });
        if (draft.action === 'skip') {
          await updateMessageStatus('rejected', savedId, userId);
        } else {
          await insertDraft({ message_id: savedId, user_id: userId, content: draft.content, version: 1 });
          await updateMessageStatus('drafted', savedId, userId);
          console.log(`   ✍️  Draft ready`);
        }
      } catch (e) {
        await updateMessageStatus('pending', savedId, userId);
      }
    }
  } catch (e) { console.error(`❌ [User ${userId}] Process error:`, e.message); }
}

async function startForUser(userId, config) {
  if (connections.has(userId)) return;

  const password = decrypt(config.email_password_enc);
  const client = new ImapFlow({
    host: config.imap_host || 'imap.gmail.com',
    port: config.imap_port || 993,
    secure: true,
    auth: { user: config.email_address, pass: password },
    logger: false
  });

  const conn = { client, connected: false };
  connections.set(userId, conn);

  client.on('error', () => { conn.connected = false; });
  client.on('close', () => { conn.connected = false; connections.delete(userId); });

  try {
    await client.connect();
    conn.connected = true;
    console.log(`✅ [User ${userId}] Email monitor: ${config.email_address}`);

    await client.mailboxOpen('INBOX');

    client.on('exists', async (data) => {
      const lock = await client.getMailboxLock('INBOX');
      try {
        for await (const msg of client.fetch(`${data.count}:*`, { source: true, envelope: true }, { uid: false })) {
          if (msg.source) {
            const parsed = await simpleParser(msg.source);
            await processEmail(parsed, userId, config.email_address);
          }
        }
      } catch (e) {} finally { lock.release(); }
    });

    await client.idle();
  } catch (e) {
    console.error(`❌ [User ${userId}] IMAP failed:`, e.message);
    connections.delete(userId);
  }
}

async function stopForUser(userId) {
  const conn = connections.get(userId);
  if (conn) {
    try { await conn.client.logout(); } catch (e) {}
    connections.delete(userId);
  }
}

async function startAllActive() {
  const configs = await getActiveEmailConfigs();
  for (const config of configs) {
    startForUser(config.user_id, config).catch(() => {});
  }
  console.log(`📧 Started monitoring for ${configs.length} active user(s)`);
}

function getUserStatus(userId) {
  const conn = connections.get(userId);
  return { connected: conn?.connected || false };
}

module.exports = { startForUser, stopForUser, startAllActive, getUserStatus };
