const nodemailer = require('nodemailer');
const { getMessageById, getDraftByMessageId, insertSentReply, updateMessageStatus, getEmailConfig } = require('../db');
const { decrypt } = require('../crypto');

const transporters = new Map();

function getTransporter(userId) {
  if (transporters.has(userId)) return transporters.get(userId);

  const config = getEmailConfig(userId);
  if (!config) return null;

  const password = decrypt(config.email_password_enc);
  const t = nodemailer.createTransport({
    host: config.smtp_host || 'smtp.gmail.com',
    port: config.smtp_port || 587,
    secure: (config.smtp_port || 587) === 465,
    auth: { user: config.email_address, pass: password }
  });

  transporters.set(userId, t);
  return t;
}

async function sendReply(messageId, userId) {
  const transporter = getTransporter(userId);
  if (!transporter) throw new Error('Email not configured');

  const message = getMessageById(messageId, userId);
  if (!message) throw new Error('Message not found');

  const draft = getDraftByMessageId(messageId, userId);
  if (!draft) throw new Error('No draft found');

  const content = draft.edited_content || draft.content;
  let headers = {};
  try {
    const raw = JSON.parse(message.raw_headers || '{}');
    if (raw.messageId) {
      headers['In-Reply-To'] = raw.messageId;
      headers['References'] = [raw.references, raw.messageId].filter(Boolean).flat().join(' ');
    }
  } catch (e) {}

  let subject = message.subject || '';
  if (!subject.toLowerCase().startsWith('re:')) subject = `Re: ${subject}`;

  const config = getEmailConfig(userId);

  try {
    const info = await transporter.sendMail({
      from: config.email_address, to: message.sender_email || message.sender_id,
      subject, text: content, headers
    });
    insertSentReply({ message_id: messageId, user_id: userId, draft_id: draft.id, content, status: 'sent', error: null });
    updateMessageStatus('sent', messageId, userId);
    console.log(`📤 [User ${userId}] Reply sent to ${message.sender_email}`);
    return { success: true };
  } catch (error) {
    insertSentReply({ message_id: messageId, user_id: userId, draft_id: draft.id, content, status: 'failed', error: error.message });
    updateMessageStatus('failed', messageId, userId);
    throw error;
  }
}

module.exports = { sendReply };
