import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';

interface FeedbackSubmission {
  id: string;
  type: 'bug' | 'feature' | 'general';
  message: string;
  email?: string;
  context: {
    url: string;
    userAgent: string;
    timestamp: string;
    screenSize: string;
    sessionId?: string;
  };
  submittedAt: string;
  status: 'new' | 'reviewed' | 'resolved';
}

// Feedback storage location
const FEEDBACK_DIR = path.join(process.env.HOME || '', '.coder1', 'alpha-feedback');
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, 'feedback.json');

// Ensure feedback directory exists
function ensureFeedbackDir() {
  if (!fs.existsSync(FEEDBACK_DIR)) {
    fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
  }
  if (!fs.existsSync(FEEDBACK_FILE)) {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify({ feedback: [] }, null, 2));
  }
}

// Load existing feedback
function loadFeedback(): FeedbackSubmission[] {
  ensureFeedbackDir();
  try {
    const data = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.feedback || [];
  } catch (error) {
    console.error('Error loading feedback:', error);
    return [];
  }
}

// Save feedback
function saveFeedback(feedback: FeedbackSubmission[]) {
  ensureFeedbackDir();
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify({ feedback, lastUpdated: new Date().toISOString() }, null, 2));
}

// Generate unique ID
function generateId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * POST /api/alpha-feedback
 * Submit new alpha feedback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { type, message, email, context } = body;

    // Validate required fields
    if (!type || !message) {
      return NextResponse.json(
        { error: 'Type and message are required' },
        { status: 400 }
      );
    }

    // Validate feedback type
    if (!['bug', 'feature', 'general'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      );
    }

    // Create new feedback entry
    const newFeedback: FeedbackSubmission = {
      id: generateId(),
      type,
      message: message.trim(),
      email: email?.trim() || undefined,
      context: {
        url: context?.url || '',
        userAgent: context?.userAgent || '',
        timestamp: context?.timestamp || new Date().toISOString(),
        screenSize: context?.screenSize || '',
        sessionId: context?.sessionId || undefined,
      },
      submittedAt: new Date().toISOString(),
      status: 'new',
    };

    // Load existing feedback and add new entry
    const allFeedback = loadFeedback();
    allFeedback.push(newFeedback);
    saveFeedback(allFeedback);

    // Send email notification if configured
    if (process.env.RESEND_API_KEY && process.env.FEEDBACK_EMAIL_TO) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        const emailType = type === 'bug' ? '🐛 Bug Report' :
                         type === 'feature' ? '💡 Feature Request' :
                         '💬 General Feedback';

        await resend.emails.send({
          from: process.env.FEEDBACK_EMAIL_FROM || 'Coder1 Feedback <feedback@resend.dev>',
          to: process.env.FEEDBACK_EMAIL_TO,
          subject: `[Coder1 Alpha] ${emailType}`,
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #00D9FF 0%, #FB923C 100%); padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">New Alpha Feedback</h1>
              </div>

              <div style="background: #1a1a1a; padding: 30px; border-radius: 0 0 8px 8px;">
                <div style="background: #2a2a2a; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                  <p style="color: #00D9FF; font-weight: bold; margin: 0 0 5px 0; font-size: 14px;">TYPE</p>
                  <p style="color: white; margin: 0; font-size: 16px;">${emailType}</p>
                </div>

                <div style="background: #2a2a2a; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                  <p style="color: #00D9FF; font-weight: bold; margin: 0 0 10px 0; font-size: 14px;">MESSAGE</p>
                  <p style="color: #e0e0e0; margin: 0; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                </div>

                ${email ? `
                <div style="background: #2a2a2a; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                  <p style="color: #00D9FF; font-weight: bold; margin: 0 0 5px 0; font-size: 14px;">USER EMAIL</p>
                  <p style="color: white; margin: 0;">${email}</p>
                </div>
                ` : ''}

                <div style="background: #2a2a2a; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                  <p style="color: #00D9FF; font-weight: bold; margin: 0 0 10px 0; font-size: 14px;">CONTEXT</p>
                  <table style="width: 100%; color: #e0e0e0; font-size: 13px;">
                    <tr>
                      <td style="padding: 5px 0; color: #999;">URL:</td>
                      <td style="padding: 5px 0;">${context?.url || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #999;">Screen:</td>
                      <td style="padding: 5px 0;">${context?.screenSize || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #999;">Time:</td>
                      <td style="padding: 5px 0;">${new Date(newFeedback.submittedAt).toLocaleString()}</td>
                    </tr>
                    ${context?.sessionId ? `
                    <tr>
                      <td style="padding: 5px 0; color: #999;">Session:</td>
                      <td style="padding: 5px 0;">${context.sessionId}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>

                <div style="background: #2a2a2a; padding: 15px; border-radius: 6px;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    Feedback ID: ${newFeedback.id}<br>
                    View all feedback: <a href="http://localhost:3001/api/alpha-feedback" style="color: #00D9FF;">http://localhost:3001/api/alpha-feedback</a>
                  </p>
                </div>
              </div>
            </div>
          `,
        });

        console.log('✅ Feedback email sent successfully');
      } catch (emailError) {
        console.error('❌ Failed to send feedback email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Log to console for immediate visibility during alpha
    console.log('\n========================================');
    console.log('📬 NEW ALPHA FEEDBACK RECEIVED');
    console.log('========================================');
    console.log(`Type: ${type.toUpperCase()}`);
    console.log(`Message: ${message}`);
    if (email) console.log(`Email: ${email}`);
    console.log(`Timestamp: ${newFeedback.submittedAt}`);
    console.log(`ID: ${newFeedback.id}`);
    console.log('========================================\n');

    return NextResponse.json({
      success: true,
      id: newFeedback.id,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alpha-feedback
 * Retrieve all feedback (for admin viewing)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    let feedback = loadFeedback();

    // Filter by status if provided
    if (status) {
      feedback = feedback.filter(f => f.status === status);
    }

    // Filter by type if provided
    if (type) {
      feedback = feedback.filter(f => f.type === type);
    }

    // Sort by newest first
    feedback.sort((a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    return NextResponse.json({
      success: true,
      count: feedback.length,
      feedback,
    });
  } catch (error) {
    console.error('Error loading feedback:', error);
    return NextResponse.json(
      { error: 'Failed to load feedback' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/alpha-feedback
 * Update feedback status (for admin)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID and status are required' },
        { status: 400 }
      );
    }

    if (!['new', 'reviewed', 'resolved'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const allFeedback = loadFeedback();
    const feedbackIndex = allFeedback.findIndex(f => f.id === id);

    if (feedbackIndex === -1) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    allFeedback[feedbackIndex].status = status;
    saveFeedback(allFeedback);

    return NextResponse.json({
      success: true,
      message: 'Feedback status updated',
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}
