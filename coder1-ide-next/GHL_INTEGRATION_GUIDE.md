# 🚀 Go High Level Integration Guide for CoderOne

## Overview

This guide explains how to set up and use the Go High Level (GHL) CRM integration with CoderOne IDE. The integration provides professional customer tracking, email automation, and marketing workflows.

## ✅ What's Been Implemented

### 1. Core Integration Service
- **Location**: `/services/gohighlevel-service.ts`
- **Features**:
  - GHL SDK integration with authentication
  - Contact management (create, update, retrieve)
  - Activity tracking
  - Custom field mapping
  - Webhook signature verification
  - Connection testing

### 2. User Sync Service
- **Location**: `/services/ghl-user-sync.ts`
- **Features**:
  - Automatic sync on user registration
  - Login tracking
  - Project creation tracking
  - AI usage tracking
  - Subscription change tracking
  - Batch sync for existing users

### 3. Webhook Handler
- **Endpoint**: `/api/webhooks/ghl`
- **Handles**:
  - Contact events (create, update, delete)
  - Tag events
  - Opportunity events
  - Email engagement (opens, clicks)
  - Form submissions
  - SMS replies

### 4. Admin Dashboard
- **Location**: `/app/admin/page.tsx`
- **Features**:
  - User overview with statistics
  - GHL connection status
  - User search and filtering
  - CSV export
  - Batch sync trigger
  - Real-time metrics

### 5. Automation Workflows API
- **Endpoint**: `/api/ghl/workflows`
- **Workflows**:
  - Welcome sequence
  - Pro upgrade celebration
  - Re-engagement campaigns
  - Milestone achievements
  - Support requests
  - Feature announcements
  - Feedback surveys

### 6. Test Endpoint
- **Endpoint**: `/api/ghl/test`
- **Tests**:
  - Connection verification
  - Contact creation
  - Activity tracking
  - Webhook endpoint health

## 🔧 Setup Instructions

### Step 1: Get Your GHL Credentials

1. Log into your Go High Level account
2. Navigate to **Settings > Integrations > API**
3. Create a new API key or OAuth app
4. Copy your credentials

### Step 2: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Enable GHL Integration
ENABLE_GHL_INTEGRATION=true

# GHL API Authentication (choose one method)
# Method 1: API Key (simpler)
GHL_API_KEY=your-api-key-here

# Method 2: OAuth (more secure)
GHL_CLIENT_ID=your-client-id
GHL_CLIENT_SECRET=your-client-secret

# Required: Your GHL Location ID
GHL_LOCATION_ID=your-location-id

# Webhook Security
GHL_WEBHOOK_SECRET=your-webhook-secret

# Optional: Workflow IDs
GHL_WORKFLOW_ONBOARDING=workflow-id
GHL_WORKFLOW_PRO_UPGRADE=workflow-id
GHL_WORKFLOW_REENGAGEMENT=workflow-id
GHL_WORKFLOW_MILESTONE=workflow-id
GHL_WORKFLOW_SUPPORT=workflow-id

# Admin Access
ADMIN_EMAILS=your-email@example.com,other-admin@example.com
```

### Step 3: Set Up GHL Webhooks

1. In GHL, go to **Settings > Webhooks**
2. Create a new webhook
3. Set the URL to: `https://your-domain.com/api/webhooks/ghl`
   - For local testing: Use ngrok to expose your local server
4. Select events to listen for:
   - Contact Create/Update/Delete
   - Tag Added/Removed
   - Opportunity Status Update
   - Email Opened/Clicked
   - Form Submitted
5. Copy the webhook secret and add to `.env.local`

### Step 4: Create Custom Fields in GHL

Create these custom fields in your GHL location:
- `userId` (Text)
- `subscriptionTier` (Dropdown: free, pro, team)
- `lastProject` (Text)
- `totalProjects` (Number)
- `aiUsage` (Number)
- `lastActive` (Date)

Note the field IDs and add to `.env.local`:
```env
GHL_FIELD_USER_ID=field_id_here
GHL_FIELD_SUBSCRIPTION_TIER=field_id_here
# ... etc
```

### Step 5: Test the Integration

```bash
# 1. Start your server
npm run dev

# 2. Test the connection
curl http://localhost:3001/api/ghl/test

# 3. Check webhook health
curl http://localhost:3001/api/webhooks/ghl
```

## 📊 Using the Admin Dashboard

### Access the Dashboard
Navigate to: `http://localhost:3001/admin`

**Note**: You must be logged in with an admin email (configured in `ADMIN_EMAILS`)

### Dashboard Features

1. **User Overview**:
   - Total users count
   - Active users today
   - Pro/Team subscribers
   - New signups this week

2. **GHL Integration Status**:
   - Connection status
   - Total contacts in GHL
   - Recent signups
   - Webhook configuration

3. **User Management**:
   - Search by email/username
   - Filter by subscription tier
   - View GHL sync status
   - Export to CSV

4. **Actions**:
   - **Export CSV**: Download all user data
   - **Sync with GHL**: Batch sync all users to GHL

## 🔄 Automatic User Sync

### When Users Are Synced

1. **Registration**: New users are automatically created as GHL contacts
2. **Login**: Login events are tracked in GHL
3. **Project Creation**: Projects are tracked with milestone tags
4. **AI Usage**: AI feature usage is recorded
5. **Subscription Changes**: Tier changes trigger workflows

### Tags Applied Automatically

- `CoderOne User` - All users
- `Alpha Launch` - Early adopters
- `Free Tier` / `Pro Tier` / `Team Tier` - Subscription level
- `First Project Created` - Milestone
- `5 Projects Milestone` - Achievement
- `Power User - 10 Projects` - Heavy usage
- `Paid Customer` - Pro/Team users

## 🎯 Triggering Workflows

### Via API

```javascript
// Example: Trigger welcome workflow
fetch('/api/ghl/workflows', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    workflow: 'welcome',
    userId: 'user-id',
    metadata: {
      customField: 'value'
    }
  })
});
```

### Available Workflows

- `welcome` - New user onboarding
- `pro-upgrade` - Pro tier celebration
- `inactive-user` - Re-engagement
- `milestone` - Achievement notification
- `support` - Support ticket creation
- `feature-announcement` - New features
- `survey` - Feedback collection

## 📈 Monitoring & Analytics

### GHL Contact Stats API
```bash
GET /api/admin/ghl-stats
```

Returns:
- Total contacts
- Recent signups
- Subscription breakdown
- Tag distribution
- Connection status

### User Metrics
- Login frequency
- Project creation rate
- AI usage patterns
- Subscription conversions

## 🐛 Troubleshooting

### Connection Issues

1. **Test the connection**:
   ```bash
   curl http://localhost:3001/api/ghl/test
   ```

2. **Check credentials**:
   - Verify API key is correct
   - Ensure location ID is set
   - Check webhook secret matches

3. **View logs**:
   - Check terminal for error messages
   - Look for "GHL" prefixed log entries

### Webhook Issues

1. **Verify webhook endpoint**:
   ```bash
   curl http://localhost:3001/api/webhooks/ghl
   ```

2. **Check signature**:
   - Ensure `GHL_WEBHOOK_SECRET` matches GHL settings
   - Look for "Invalid signature" errors in logs

3. **Use ngrok for local testing**:
   ```bash
   ngrok http 3001
   # Use the https URL for webhook configuration
   ```

### Sync Issues

1. **Manual sync single user**:
   - Use the admin dashboard
   - Click "Sync with GHL" button

2. **Batch sync all users**:
   ```bash
   POST /api/admin/users
   { "action": "sync-ghl" }
   ```

3. **Check sync status**:
   - View user table in admin dashboard
   - Look for GHL status icon

## 🎉 Next Steps

1. **Create Automation Workflows in GHL**:
   - Design welcome email sequence
   - Set up re-engagement campaigns
   - Create milestone notifications

2. **Configure Email Templates**:
   - Design branded email templates
   - Set up dynamic content
   - Test deliverability

3. **Set Up Pipelines**:
   - Create sales pipeline for conversions
   - Track user journey stages
   - Monitor conversion rates

4. **Enable Advanced Features**:
   - SMS notifications
   - Appointment scheduling
   - Review collection

## 📚 Resources

- [Go High Level API Documentation](https://developers.gohighlevel.com/)
- [GHL SDK on NPM](https://www.npmjs.com/package/@gohighlevel/api-client)
- [Webhook Testing with ngrok](https://ngrok.com/)
- [GHL Community](https://www.facebook.com/groups/gohighlevel)

## 🆘 Support

For issues specific to the CoderOne integration:
1. Check this guide first
2. Review error logs
3. Test with `/api/ghl/test` endpoint
4. Contact support with error details

---

*Last Updated: January 2025*
*Integration Version: 1.0.0*