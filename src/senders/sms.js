/**
 * SMS Sender Module using Semaphore API (Philippine SMS Gateway)
 */

async function sendSMSCode(phoneNumber, code) {
  const apiKey = process.env.SEMAPHORE_API_KEY;
  const cleanNumber = phoneNumber.trim();
  const message = `🔒 AutoInbox Verification Code: ${code}\n\nThis code will expire in 15 minutes. Secure your account.`;

  console.log(`📱 Generating SMS Verification for ${cleanNumber}...`);

  if (apiKey) {
    try {
      const response = await fetch('https://api.semaphore.co/api/v4/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          apikey: apiKey,
          number: cleanNumber,
          message: message
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.errors?.[0]?.message || 'Failed to send SMS');
      }

      console.log(`📱 SMS successfully sent to ${cleanNumber} via Semaphore ✅`);
      return { success: true, smsSent: true };
    } catch (err) {
      console.error(`❌ Failed to send SMS via Semaphore to ${cleanNumber}:`, err.message);
      return { success: false, smsSent: false, error: err.message };
    }
  }

  // Local development console fallback if API key is not configured
  console.log('\n==================================================');
  console.log('📱 [DEVELOPMENT FALLBACK] SMS Verification Code');
  console.log(`📱 To: ${cleanNumber}`);
  console.log(`📱 Message: ${message}`);
  console.log('==================================================\n');

  return { success: true, smsSent: false, fallbackCode: code };
}

module.exports = { sendSMSCode };
