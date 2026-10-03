async function sendWithFallback({
  smtpTransporter,
  smtpFrom,
  resendApiKey,
  resendFrom,
  message,
  fetchImpl = globalThis.fetch,
  timeoutMs = 10000
}) {
  const sender = resendFrom || 'SOCRATES <onboarding@resend.dev>';
  let smtpError;

  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({ from: smtpFrom, ...message });
      return 'smtp';
    } catch (error) {
      smtpError = error;
    }
  }

  if (!resendApiKey) {
    if (smtpError) throw smtpError;
    throw new Error('Email delivery is not configured. Set SMTP credentials or RESEND_API_KEY.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: sender, ...message }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Resend email API returned HTTP ${response.status}`);
    }
    return 'resend';
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { sendWithFallback };