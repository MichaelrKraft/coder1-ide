import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireTeamAdmin } from '@/lib/auth/team-middleware';
import { createTeamInvitation, getTeamById } from '@/lib/auth';
import { Resend } from 'resend';

async function sendInviteEmail(toEmail: string, inviteLink: string, teamName: string, inviterName: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Coder1 <noreply@coder1.dev>';
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `You've been invited to join ${teamName} on Coder1`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #00D9FF 0%, #0a0a0a 100%); padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">You're invited to ${teamName}</h1>
          </div>
          <div style="background: #1a1a1a; padding: 30px; border-radius: 0 0 8px 8px; color: #ccc;">
            <p><strong style="color: #00D9FF;">${inviterName}</strong> has invited you to collaborate on Coder1 IDE.</p>
            <p>Click the button below to join the team:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${inviteLink}" style="display: inline-block; background: #00D9FF; color: #0a0a0a; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                Join ${teamName}
              </a>
            </div>
            <p style="color: #666; font-size: 13px;">This invitation expires in 7 days. If the button doesn't work, copy this link: ${inviteLink}</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error('[Team Invite] Failed to send email:', error);
    throw error;
  }
}

/**
 * POST /api/team/[teamId]/invite
 * Invite a user to the team by email. Requires admin.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { teamId } = await params;

    // Require admin or owner
    await requireTeamAdmin(user.id, teamId);

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const invitation = await createTeamInvitation(teamId, email.trim(), user.id);

    const inviteLink = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/team/join?token=${invitation.token}`;

    const team = await getTeamById(teamId);
    let emailSent = false;
    let emailError: string | undefined;
    try {
      await sendInviteEmail(email.trim(), inviteLink, team?.name || 'your team', user.username || 'A team member');
      emailSent = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : 'Unknown email error';
      console.error('[Team Invite] Email send failed:', err);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        token: invitation.token,
        expires_at: invitation.expires_at,
        invite_link: inviteLink,
        email_sent: emailSent,
        ...(emailError ? { email_error: emailError } : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401
                 : message.includes('Not a team member') ? 403
                 : message.includes('Admin') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
