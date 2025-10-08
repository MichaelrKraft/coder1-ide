# 📋 Content Review Dashboard - User Guide

**Status**: ✅ **READY TO USE!**  
**Dashboard URL**: http://localhost:3006  
**Created**: October 6, 2025

---

## 🎉 What You Just Got

A **beautiful, easy-to-use web dashboard** for reviewing all your AI-generated content!

### Features:
- ✅ **Full content preview** - See complete blog posts, scripts, case studies
- ✅ **One-click actions** - Approve, reject, or edit with single button
- ✅ **Real-time stats** - Track pending, approved, and rejected items
- ✅ **Edit in browser** - Modify content before approving
- ✅ **No terminal needed** - Everything in your browser!

---

## 🚀 Quick Start (3 Steps)

### Step 1: Start the Dashboard Server

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/agents
node review-dashboard-server.js
```

**Or to run on a different port:**
```bash
REVIEW_PORT=3007 node review-dashboard-server.js
```

### Step 2: Open Your Browser

Visit: **http://localhost:3006**

### Step 3: Review Content!

- **Approve**: Click green "✓ Approve" button
- **Reject**: Click red "✗ Reject" button  
- **Edit**: Click orange "✏️ Edit" button to modify content

---

## 📊 Dashboard Overview

### Stats Cards (Top)
Shows real-time counts:
- **Pending Review**: Items waiting for your decision
- **Approved**: Total approved items
- **Rejected**: Total rejected items
- **Total Items**: All items ever generated

### Content Cards
Each card shows:
- **Type**: blog_post, issue_response, youtube_script, case_study
- **Title/Topic**: What the content is about
- **ID**: Unique identifier (from your digest email)
- **Confidence**: AI's confidence score (if available)
- **Full Content**: Complete text with syntax highlighting
- **Actions**: Approve, Edit, or Reject buttons

---

## 💡 How to Use

### Approving Content

1. **Read the full content** (scroll through the preview)
2. **Click "✓ Approve"**
3. **Confirm** the action
4. **Done!** Item moves to `review-queue/approved/`

**What happens:**
- File moves from `pending/` to `approved/`
- Status changes to "approved"
- Timestamp added: `approved_at`
- Ready for publishing (manual or automated)

### Rejecting Content

1. **Click "✗ Reject"**
2. **Enter rejection reason** (optional but recommended)
3. **Confirm** the action

**What happens:**
- File moves from `pending/` to `rejected/`
- Status changes to "rejected"
- Reason saved in file
- AI can learn from rejections (future feature)

### Editing Content

1. **Click "✏️ Edit"**
2. **Modify the text** in the textarea
3. **Click "Save Changes"**
4. **Content updated!** Item stays in pending

**Use cases:**
- Fix typos or grammar
- Adjust tone or messaging
- Add missing information
- Customize for your brand voice

---

## 🔄 Workflow Example

**Morning Review Routine:**

1. **Check your email** - Daily digest shows preview
2. **Open dashboard** - http://localhost:3006
3. **Review 12 items** - Full content visible
4. **Quick decisions**:
   - Blog post about AI? ✓ Approve
   - YouTube script needs editing? ✏️ Edit → Save → ✓ Approve
   - Case study off-brand? ✗ Reject (reason: "Not aligned with messaging")
5. **Done in 10 minutes!** All content reviewed

---

## 📁 File Management

### Directory Structure
```
review-queue/
├── pending/        ← Dashboard shows these
│   ├── blog-*.json
│   ├── youtube-*.json
│   └── case-*.json
├── approved/       ← Approved items go here
└── rejected/       ← Rejected items go here
```

### After Approval
**Manual Publishing Options:**

1. **Blog Posts** → Copy to your blog CMS
2. **YouTube Scripts** → Use for video production
3. **Case Studies** → Add to marketing site
4. **Docs** → Commit to repository

**Automated Publishing** (future):
- Medium API integration
- Git docs auto-commit
- Showcase page generator

---

## 🎨 Dashboard Features

### Beautiful UI
- **Purple gradient** header (Coder1 brand colors)
- **Card-based** layout for easy scanning
- **Hover effects** on cards for visual feedback
- **Smooth animations** when loading items
- **Responsive design** works on any screen size

### Smart Content Display
- **Monospace font** for code/markdown
- **Syntax preservation** maintains formatting
- **Scrollable previews** for long content
- **Expand button** to show complete text
- **HTML-escaped** content for security

### Real-Time Updates
- **Instant refresh** after actions
- **Stats update** automatically
- **No page reload** needed for editing
- **Success confirmations** for all actions

---

## 🔧 Advanced Usage

### Keep Server Running

**Option 1: Terminal Session**
```bash
# Keep terminal open
node review-dashboard-server.js
```

**Option 2: Background Process**
```bash
# Run in background
nohup node review-dashboard-server.js > dashboard.log 2>&1 &

# Check if running
ps aux | grep review-dashboard

# View logs
tail -f dashboard.log

# Stop server
pkill -f review-dashboard-server
```

**Option 3: PM2 (Production)**
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start review-dashboard-server.js --name review-dashboard

# Auto-start on boot
pm2 startup
pm2 save

# View logs
pm2 logs review-dashboard

# Stop/restart
pm2 stop review-dashboard
pm2 restart review-dashboard
```

### Custom Port
```bash
# Use environment variable
REVIEW_PORT=8080 node review-dashboard-server.js

# Then access at: http://localhost:8080
```

### API Access

Direct API endpoints for automation:

```bash
# Get all pending items
curl http://localhost:3006/api/review-queue/pending

# Get stats
curl http://localhost:3006/api/review-queue/stats

# Approve an item
curl -X POST http://localhost:3006/api/review-queue/approve/ITEM-ID

# Reject an item
curl -X POST http://localhost:3006/api/review-queue/reject/ITEM-ID \
  -H "Content-Type: application/json" \
  -d '{"reason": "Not aligned with brand"}'

# Edit an item
curl -X PUT http://localhost:3006/api/review-queue/edit/ITEM-ID \
  -H "Content-Type: application/json" \
  -d '{"content": "Updated content here"}'
```

---

## 🐛 Troubleshooting

### Server Won't Start

**Error: Port Already in Use**
```bash
# Check what's using port 3006
lsof -i :3006

# Kill the process
kill -9 [PID]

# Or use different port
REVIEW_PORT=3007 node review-dashboard-server.js
```

### Dashboard Shows "No Items"

**Possible causes:**
1. No pending items (all reviewed!)
2. Server can't find review-queue folder
3. All items already approved/rejected

**Solutions:**
```bash
# Check pending items exist
ls -la review-queue/pending/

# Generate test content
node content-agent/blog-generator.js
```

### Actions Don't Work

**Check console:**
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for API failures

**Common issues:**
- Server not running (check terminal)
- Port mismatch (check URL)
- File permissions (check directory access)

### Content Not Showing

**Browser cache issue:**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Try incognito mode

---

## 📊 Statistics & Reporting

### View Historical Data

```bash
# Count approved items
ls review-queue/approved/*.json | wc -l

# Count rejected items
ls review-queue/rejected/*.json | wc -l

# See approval rate
python3 -c "
approved = $(ls review-queue/approved/*.json 2>/dev/null | wc -l)
rejected = $(ls review-queue/rejected/*.json 2>/dev/null | wc -l)
total = approved + rejected
rate = (approved / total * 100) if total > 0 else 0
print(f'Approval Rate: {rate:.1f}%')
"
```

### Export Approved Content

```bash
# Create single markdown file with all approved blogs
for file in review-queue/approved/blog-*.json; do
  cat "$file" | jq -r '.content'
  echo -e "\n\n---\n\n"
done > approved-blogs.md
```

---

## 🎯 Pro Tips

### Speed Up Review Process

1. **Use keyboard shortcuts**:
   - Tab = Navigate between buttons
   - Enter = Click focused button
   - Esc = Close edit modal

2. **Sort by priority**:
   - Dashboard shows newest first
   - Focus on high-confidence items
   - Review same type together

3. **Batch similar actions**:
   - Review all blog posts first
   - Then YouTube scripts
   - Then case studies

### Quality Control

- **Check facts** before approving
- **Test links** in blog posts
- **Verify code** in technical content
- **Match brand voice** consistently

### Team Review (Future)

- Multiple reviewers can use same dashboard
- Set up user accounts (future feature)
- Track who approved what
- Review history and audit trail

---

## 🚀 Next Steps

### Immediate
- ✅ Dashboard running at http://localhost:3006
- ✅ Review your 12 pending items
- ✅ Approve/reject/edit as needed

### This Week
- Set up PM2 for auto-start
- Create review routine (daily 9am)
- Export approved content for publishing

### Future Enhancements
- Email reply-based approval (approve from email)
- Slack integration for team reviews
- Auto-publish approved content
- A/B testing different content versions
- AI learning from rejections

---

## 🎉 Summary

You now have a **professional content review system** that makes managing AI-generated content easy and fun!

**Key Benefits:**
- ✅ No more terminal commands
- ✅ See full content before deciding
- ✅ Edit content in-browser
- ✅ Track everything with stats
- ✅ Review in 10 minutes instead of 60

**Dashboard URL**: http://localhost:3006

Enjoy reviewing your content! 🎊
