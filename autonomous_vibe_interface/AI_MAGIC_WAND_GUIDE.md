# 🪄 AI Magic Wand - React Component Generation Guide

## Overview
The AI Magic Wand is an integrated feature in the CoderOne IDE that allows you to generate React components using natural language descriptions. Now enhanced with **21st.dev Magic** integration for professional-grade component generation, plus a curated library of React Bits components with AI-powered generation capabilities.

## ✨ How to Use

### Method 1: Magic Floating Wand Button
1. Look for the **✨ sparkle icon** in the IDE interface
2. Click it to open the Magic Command Bar
3. Type your component description (e.g., "gradient button with hover effects")
4. Press Enter or click the arrow button to generate
5. The component code will appear in your editor

### Method 2: Keyboard Shortcut
1. Press **Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux) anywhere in the IDE
2. The Magic Command Bar will appear
3. Type your component description and press Enter

## 🎯 What You Can Generate

### Available Component Types

#### Buttons
- **Animated Button** - Smooth hover animations with scale effects
- **Glow Button** - Neon glow effect with floating animation
- **Gradient Button** - Modern gradient backgrounds

**Try:** "glow button", "animated button", "gradient button with purple"

#### Cards & Containers
- **Glass Card** - Glassmorphism effect with blur
- **Gradient Card** - Beautiful gradient backgrounds
- **Hover Card** - Elevation effects on hover

**Try:** "glass card", "product card", "testimonial card"

#### Hero Sections
- **Hero Section** - Full-screen landing sections with CTAs
- **Gradient Hero** - Eye-catching gradient backgrounds

**Try:** "hero section", "landing page header", "hero with cta"

#### Forms
- **Login Form** - Complete authentication forms
- **Contact Form** - Forms with validation
- **Signup Form** - Registration forms

**Try:** "login form", "contact form with validation", "signup form"

#### Navigation
- **Modern Navigation Bar** - Responsive nav with mobile menu
- **Sidebar Navigation** - Dashboard-style navigation

**Try:** "navbar", "navigation menu", "header with dropdown"

## 🔍 Natural Language Understanding

The Magic Wand understands various ways to describe components:

### Examples of What to Type:
- "gradient button that glows on hover"
- "pricing card like Stripe"
- "hero section with glassmorphism"
- "login form with social buttons"
- "navigation bar with dropdown"
- "testimonial card with avatar"
- "feature grid with icons"
- "modal dialog with overlay"

## 🎨 Component Features

All generated components include:
- **TypeScript Support** - Full type definitions
- **Tailwind CSS Styling** - Modern, responsive designs
- **React Hooks** - Using latest React patterns
- **Props Interface** - Customizable properties
- **Production Ready** - Clean, maintainable code

## 🚀 Integration Workflow

1. **Generate**: Use Magic Wand to create component
2. **Preview**: Component appears in the preview pane
3. **Customize**: Modify props and styling as needed
4. **Insert**: Component code is added to your file
5. **Use**: Import and use in your application

## 🛠️ Technical Details

### Component Sources
1. **React Bits Library** - Curated collection of 30+ components
2. **AI Generation** - Claude/OpenAI for custom components
3. **Template Engine** - Fallback templates for common patterns

### API Endpoints
- `POST /api/magic/generate` - Generate component
- `GET /api/magic/components` - List available components
- `POST /api/magic/search-logos` - Search for logos

### Frontend Integration
- **MagicUIService** - TypeScript service for component generation
- **MagicCommandBar** - Command palette interface
- **MagicFloatingWand** - Floating action button

## 📝 Tips for Best Results

1. **Be Specific**: "gradient button with purple to pink" > "button"
2. **Use Keywords**: Include styling hints like "glass", "glow", "gradient"
3. **Mention Frameworks**: "like Stripe", "like Apple", "Material Design"
4. **Specify Functionality**: "with hover", "with animation", "responsive"

## 🔧 Configuration

### Environment Variables
```bash
# Optional: Enable AI generation
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
```

### Feature Flags
The Magic Wand is enabled by default but can be toggled:
- Set `showMagicFloatingWand` in App.tsx
- Control visibility via user preferences

## 🐛 Troubleshooting

### Magic Wand Not Appearing
1. Check if the feature is enabled in App.tsx
2. Verify the build was successful
3. Clear browser cache and reload

### Component Not Generating
1. Check backend server is running
2. Verify `/api/magic` route is registered
3. Check browser console for errors

### Styling Issues
1. Ensure Tailwind CSS is loaded
2. Check for CSS conflicts
3. Verify component is in preview sandbox

## 🚦 Current Status

✅ **Completed Features:**
- Magic UI components (wand button, command bar)
- React Bits library integration (6 components)
- Backend API endpoint
- Natural language matching
- Fallback templates
- TypeScript support

🔄 **Coming Soon:**
- More React Bits components (21 total planned)
- Component customization UI
- Save favorite components
- Component history
- AI-powered variations

## 📚 Related Documentation

- [React Bits Implementation](./tasks/react-bits-implementation.md)
- [React Bits Integration](./tasks/react-bits-integration.md)
- [IDE Development Guide](./IDE_DEVELOPMENT_GUIDE.md)

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Status:** Production Ready