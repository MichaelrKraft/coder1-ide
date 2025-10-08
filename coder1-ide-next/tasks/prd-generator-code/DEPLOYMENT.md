# Coder1 PRD Generator - Deployment Guide

This guide walks you through deploying the Coder1 PRD Generator to Render.

## Prerequisites

- GitHub account
- Render account (free tier works - https://render.com)
- Anthropic API key (get one at https://console.anthropic.com/)

## Step 1: Create GitHub Repository

```bash
# Navigate to the PRD Generator code directory
cd /path/to/coder1-prd-generator

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Coder1 PRD Generator"

# Create repository on GitHub (visit github.com/new)
# Then add remote and push
git remote add origin git@github.com:YOUR_USERNAME/coder1-prd-generator.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Render

### Option A: Render Dashboard (Recommended)

1. **Visit**: https://dashboard.render.com/
2. **New Web Service**: Click "New +" → "Web Service"
3. **Connect Repository**: 
   - Authorize GitHub if needed
   - Select `coder1-prd-generator` repository
4. **Configure Service**:
   - **Name**: `coder1-prd-generator`
   - **Region**: Oregon (US West) or closest to you
   - **Branch**: `main`
   - **Root Directory**: `./` (leave blank)
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

5. **Environment Variables**:
   Click "Advanced" → Add Environment Variables:

   ```
   ANTHROPIC_API_KEY=sk-ant-api03-your-actual-api-key-here
   ANTHROPIC_MODEL=claude-sonnet-4-20250514
   NEXT_PUBLIC_CODER1_IDE_URL=https://coder1.dev/ide
   NODE_VERSION=18.17.0
   ```

6. **Create Web Service**: Click "Create Web Service"

### Option B: Render Blueprint (Infrastructure as Code)

The repository includes `render.yaml` for automated deployment:

1. **Visit**: https://dashboard.render.com/
2. **New Blueprint Instance**: Click "New +" → "Blueprint"
3. **Connect Repository**: Select `coder1-prd-generator`
4. **Add Secret**: Add `ANTHROPIC_API_KEY` in the Render dashboard
5. **Deploy**: Click "Apply" to deploy

The `render.yaml` file contains all configuration - no manual setup needed!

## Step 3: Verify Deployment

1. **Visit** your deployed URL (e.g., `https://coder1-prd-generator.onrender.com`)
2. **Wait for Build**: First build takes 3-5 minutes (Render free tier)
3. **Test** the 5-question flow:
   - Answer all 5 questions
   - Click "Generate PRD"
   - Verify PRD generates successfully
4. **Test Export Features**:
   - Export as Markdown
   - Export as JSON
   - Export as PDF
5. **Test Coder1 Handoff**:
   - Click "🚀 Build This in Coder1 IDE"
   - Verify URL includes encoded PRD data

## Step 4: Custom Domain (Optional)

1. **Add Domain** in Render dashboard:
   - Go to your service → Settings → Custom Domain
   - Click "Add Custom Domain"
   - Enter `prd.coder1.dev` or your preferred domain
2. **Configure DNS**:
   - Add CNAME record pointing to your Render URL
   - Render provides exact DNS instructions
3. **SSL**: Render auto-provisions Let's Encrypt SSL certificates (free)

## Troubleshooting

### Build Failures

**Error: "Module not found: Can't resolve '@anthropic-ai/sdk'"**
- Solution: Ensure `package.json` includes `@anthropic-ai/sdk` in dependencies
- Run `npm install` locally to verify

**Error: "Environment variable ANTHROPIC_API_KEY is not set"**
- Solution: Add environment variable in Vercel dashboard
- Redeploy after adding variables

### Runtime Errors

**Error: "invalid x-api-key"**
- Check API key format (should start with `sk-ant-api03-`)
- OAuth tokens (`sk-ant-oat01-`) do NOT work with Anthropic SDK
- Get a new API key from https://console.anthropic.com/

**Error: "Failed to generate PRD"**
- Check Anthropic API status: https://status.anthropic.com/
- Verify API key has sufficient credits
- Check Render logs for detailed errors (Logs tab in dashboard)

**Error: "Service Unavailable (503)"**
- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds to wake up
- Upgrade to paid tier ($7/month) for always-on service

### Performance Issues

**Slow PRD generation (>30 seconds)**
- Normal for complex PRDs (up to 45 seconds)
- Consider adding loading states or progress indicators
- Check Anthropic API response times

**Cold Start Delays**
- Render free tier spins down after inactivity
- First request can take 30-60 seconds
- Subsequent requests are fast (<2 seconds)
- Solution: Upgrade to Starter plan ($7/mo) for zero downtime

## Monitoring

### Render Dashboard
- View real-time metrics in Render dashboard
- Monitor deploy logs, runtime logs, and metrics
- Track response times and error rates
- Free plan includes basic monitoring

### API Usage
- Monitor Anthropic API usage at https://console.anthropic.com/
- Set up billing alerts to avoid unexpected charges

### Error Tracking
- Check Render logs for errors (real-time streaming available)
- Consider integrating Sentry for detailed error tracking
- Render provides 7 days of log history on free tier

## Cost Estimates

### Render Hosting
- **Free Tier**: 750 hours/month, spins down after 15 min inactivity
- **Starter Tier** ($7/month): Always on, no spin down, faster builds
- **Pro Tier** ($25/month): More resources, autoscaling, priority support

### Anthropic API
- **Claude Sonnet 4**: ~$3 per million input tokens, ~$15 per million output tokens
- **Average PRD**: ~2,000 input + 8,000 output tokens = ~$0.15 per PRD
- **100 PRDs/day**: ~$15/day or $450/month
- **Optimization**: Cache common questions, use lower-cost models for simple PRDs

## Scaling Considerations

### Traffic Growth
- Render free tier: Single instance, shared resources
- Render Starter: Dedicated resources, faster response
- Render Pro: Horizontal autoscaling, load balancing
- Consider CDN (Cloudflare) for static assets
- Implement rate limiting for API endpoints

### Database (Future)
- Render provides managed PostgreSQL (free tier available)
- Alternative: Supabase or PlanetScale
- Store PRD history, user profiles, analytics

### Authentication (Future)
- NextAuth.js for user accounts
- Store PRD history per user
- Premium tier for unlimited PRDs

### Upgrading from Free Tier

**When to Upgrade** (Starter $7/mo):
- Consistent traffic (100+ PRDs/day)
- Need zero downtime (no spin-down)
- Faster build times (<2 minutes vs 5+ minutes)
- Custom domain with always-on SSL

**When to Upgrade to Pro** ($25/mo):
- High traffic (1000+ PRDs/day)
- Need autoscaling
- Multiple regions for low latency
- Priority support

## Next Steps

1. **Monitor** initial user feedback and error rates
2. **Iterate** on 5 questions based on user responses
3. **Add** analytics to track question completion rates
4. **Optimize** prompt for better PRD quality
5. **Consider** A/B testing different question phrasings

## Support

- **Issues**: https://github.com/YOUR_USERNAME/coder1-prd-generator/issues
- **Discussions**: https://github.com/MichaelrKraft/coder1-community/discussions
- **Email**: support@coder1.dev

---

**Deployment Checklist**:
- [ ] GitHub repository created
- [ ] Render web service deployed
- [ ] Environment variables configured (especially ANTHROPIC_API_KEY)
- [ ] Wait for initial build to complete (3-5 minutes)
- [ ] Test PRD generation works
- [ ] Test all export formats (Markdown, JSON, PDF)
- [ ] Test Coder1 IDE handoff button
- [ ] Custom domain configured (optional)
- [ ] Error monitoring set up
- [ ] Consider upgrading to Starter tier if spin-down is problematic

**Estimated Time**: 
- **Setup**: 10-15 minutes
- **First Build**: 3-5 minutes (free tier)
- **Total**: ~20 minutes for complete deployment

---

*Last Updated: October 3, 2025*
