/**
 * SMS Sender Module using Semaphore (for Philippine numbers) and Twilio (for international numbers)
 */

async function sendSMSCode(phoneNumber, code) {
  const cleanNumber = phoneNumber.trim();
  const message = `🔒 AutoInbox Verification Code: ${code}\n\nThis code will expire in 15 minutes. Secure your account.`;
  const isPH = cleanNumber.startsWith('+63');

  console.log(`📱 Generating SMS Verification for ${cleanNumber}...`);

  if (isPH) {
    // Philippine number: Use Semaphore local gateway
    const apiKey = process.env.SEMAPHORE_API_KEY;
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

        console.log(`📱 PH SMS successfully sent to ${cleanNumber} via Semaphore ✅`);
        return { success: true, smsSent: true };
      } catch (err) {
        console.error(`❌ Failed to send SMS via Semaphore to ${cleanNumber}:`, err.message);
        return { success: false, smsSent: false, error: err.message };
      }
    }
  } else {
    // International number: Use Twilio global gateway
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;

    if (twilioSid && twilioAuthToken && twilioFromNumber) {
      try {
        const auth = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${auth}`
          },
          body: new URLSearchParams({
            To: cleanNumber,
            From: twilioFromNumber,
            Body: message
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Twilio send failed');
        }

        console.log(`📱 Global SMS successfully sent to ${cleanNumber} via Twilio ✅`);
        return { success: true, smsSent: true };
      } catch (err) {
        console.error(`❌ Failed to send SMS via Twilio to ${cleanNumber}:`, err.message);
        return { success: false, smsSent: false, error: err.message };
      }
    }
  }

  // Local development console fallback if API keys are not configured
  console.log('\n==================================================');
  console.log('📱 [DEVELOPMENT FALLBACK] SMS Verification Code');
  console.log(`📱 To: ${cleanNumber}`);
  console.log(`📱 Message: ${message}`);
  console.log('==================================================\n');

  return { success: true, smsSent: false, fallbackCode: code };
}

module.exports = { sendSMSCode };
