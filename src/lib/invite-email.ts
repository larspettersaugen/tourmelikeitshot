export async function sendInviteEmail(
  to: string,
  personName: string,
  inviteUrl: string
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, error: 'Email not configured (RESEND_API_KEY)' };
  }
  try {
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: `You're invited to ${process.env.NEXT_PUBLIC_APP_NAME || 'Tour It Like Its Hot'}`,
        html: `
          <p>Hi ${personName},</p>
          <p>You've been added to the touring crew app. Click the link below to set your password and access your profile:</p>
          <p><a href="${inviteUrl}" style="color: #6366f1; text-decoration: underline;">Set up your account</a></p>
          <p>Or copy this link: ${inviteUrl}</p>
          <p>This link expires in 7 days.</p>
          <p>If you didn't expect this email, you can ignore it.</p>
        `,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { sent: false, error: (data as { message?: string }).message || res.statusText };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : 'Failed to send' };
  }
}
