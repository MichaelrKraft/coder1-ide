import { NextRequest, NextResponse } from 'next/server';
import { addToWaitlist, getWaitlistByEmail, getWaitlistCount, deleteFromWaitlist } from '@/lib/alpha-waitlist-db';
import { Resend } from 'resend';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendNotificationEmail(data: {
  email: string;
  name: string | null;
  redditUsername: string | null;
  source: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.WAITLIST_NOTIFY_EMAIL || process.env.FEEDBACK_EMAIL_TO;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Coder1 <noreply@coder1.dev>';

  if (!apiKey || !notifyEmail) return;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: notifyEmail,
      subject: `[Coder1 Alpha] New Waitlist Signup — ${data.email}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #00D9FF 0%, #FB923C 100%); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">New Alpha Waitlist Signup</h1>
          </div>
          <div style="background: #1a1a1a; padding: 30px; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #999; padding: 8px 0; width: 140px;">Email</td>
                <td style="color: #fff; padding: 8px 0;">${data.email}</td>
              </tr>
              ${data.name ? `<tr>
                <td style="color: #999; padding: 8px 0;">Name</td>
                <td style="color: #fff; padding: 8px 0;">${data.name}</td>
              </tr>` : ''}
              ${data.redditUsername ? `<tr>
                <td style="color: #999; padding: 8px 0;">Reddit</td>
                <td style="color: #fff; padding: 8px 0;">u/${data.redditUsername}</td>
              </tr>` : ''}
              <tr>
                <td style="color: #999; padding: 8px 0;">Source</td>
                <td style="color: #fff; padding: 8px 0;">${data.source}</td>
              </tr>
              <tr>
                <td style="color: #999; padding: 8px 0;">Time</td>
                <td style="color: #fff; padding: 8px 0;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
        </div>
      `,
    });
  } catch (err) {
    // Non-blocking — don't fail the request if email fails
    console.error('[Waitlist] Notification email failed:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, fullName, name, redditUsername, source, utm_content } = body;
    const displayName = fullName || name || null;
    const resolvedSource = utm_content || source || 'website';

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check if email already exists
    const existing = getWaitlistByEmail(email);
    if (existing) {
      return NextResponse.json(
        {
          error: 'Email already registered',
          message: 'This email is already on the waitlist',
        },
        { status: 409 }
      );
    }

    // Add to waitlist
    const entry = addToWaitlist({
      email: email.toLowerCase().trim(),
      name: displayName,
      reddit_username: redditUsername || null,
      source: resolvedSource,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Fire-and-forget notification email to Mike
    sendNotificationEmail({
      email: email.toLowerCase().trim(),
      name: displayName,
      redditUsername: redditUsername || null,
      source: resolvedSource,
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully added to waitlist',
      id: entry.id,
    });

  } catch (error: any) {
    console.error('[Waitlist] Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const count = getWaitlistCount();

    return NextResponse.json({
      totalSignups: count,
      message: 'Waitlist statistics',
    });

  } catch (error: any) {
    console.error('[Waitlist] Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve statistics' },
      { status: 500 }
    );
  }
}

// DELETE — remove email from waitlist (dev only)
export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    const deleted = deleteFromWaitlist(email);

    return NextResponse.json({
      success: true,
      deleted,
      message: deleted
        ? `Removed ${email} from waitlist`
        : 'Email not found in waitlist',
    });

  } catch (error: any) {
    console.error('[Waitlist] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete', details: error.message },
      { status: 500 }
    );
  }
}
