# 🎯 Coder1 PRD Generator

**AI-Powered Product Requirements Documents in Minutes**

Transform your product idea into a comprehensive, professional PRD through a simple 5-question conversation with AI.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

---

## 🚀 What Is This?

The Coder1 PRD Generator is a **free, open-source tool** that uses AI to help you create detailed Product Requirements Documents. Whether you're a founder, product manager, or developer, this tool guides you through the process of defining your product with strategic questions.

### ✨ Key Features

- **5 Strategic Questions**: AI asks exactly what it needs to know
- **Comprehensive Output**: Get a complete PRD with technical specs, user stories, and edge cases
- **Multiple Export Formats**: Download as Markdown, JSON, or PDF
- **No Signup Required**: Start using immediately
- **100% Free**: No hidden costs, no premium tiers
- **Open Source**: MIT licensed, fork and customize as needed

### 🎁 Bonus: Launch in Coder1 IDE

After generating your PRD, click **"Build This in Coder1 IDE"** to launch directly into our development environment with your full project context pre-loaded. The IDE features:

- **Multi-LLM Switching**: Switch between Claude and Gemini mid-session (never get rate-limited)
- **Eternal Memory**: AI remembers your entire project history
- **7-Day Free Trial**: Experience the magic before subscribing

---

## 🎬 How It Works

### 1. Answer 5 Questions

The AI asks strategic questions about your product:
- What problem are you solving?
- Who are your target users?
- What are the core features?
- What are your success metrics?
- What are your constraints (budget, timeline, tech)?

### 2. AI Generates Your PRD

Based on your answers, the AI creates:
- **Executive Summary**: Clear overview of your product
- **Problem Statement**: The pain point you're addressing
- **Target Audience**: User personas and demographics
- **Core Features**: Detailed feature specifications
- **User Stories**: "As a [user], I want [feature] so that [benefit]"
- **Technical Requirements**: Architecture, tech stack, APIs
- **Success Metrics**: KPIs and measurement strategy
- **Edge Cases**: Potential issues and solutions
- **Timeline**: Suggested development phases

### 3. Export & Use

- Download as Markdown (readable, version controllable)
- Download as JSON (programmatically parseable)
- Download as PDF (client-ready, professional)
- **OR** Launch directly into Coder1 IDE to start building

---

## 🛠️ Installation & Usage

### Option 1: Use the Live Version (Recommended)

Visit **[coder1-prd-generator.vercel.app](https://coder1-prd-generator.vercel.app)** and start generating immediately.

### Option 2: Run Locally

```bash
# Clone the repository
git clone https://github.com/MichaelrKraft/coder1-prd-generator.git
cd coder1-prd-generator

# Install dependencies
npm install

# Set up your Anthropic API key
cp .env.example .env.local
# Edit .env.local and add: ANTHROPIC_API_KEY=your-key-here

# Run the development server
npm run dev

# Open http://localhost:3000
```

### Option 3: Deploy Your Own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/MichaelrKraft/coder1-prd-generator)

Click the button above and follow the prompts. You'll need to add your `ANTHROPIC_API_KEY` in the Vercel environment variables.

---

## 📁 Project Structure

```
coder1-prd-generator/
├── app/
│   ├── page.tsx              # Main PRD generation interface
│   ├── api/
│   │   ├── generate/route.ts # AI PRD generation endpoint
│   │   └── export/route.ts   # PDF export endpoint
│   └── layout.tsx            # Root layout
├── components/
│   ├── PRDForm.tsx           # 5-question interview form
│   ├── PRDDisplay.tsx        # Generated PRD display
│   ├── ExportButtons.tsx     # Export to MD/JSON/PDF
│   └── LaunchButton.tsx      # "Launch in Coder1" CTA
├── lib/
│   ├── anthropic.ts          # Anthropic API client
│   ├── prd-template.ts       # PRD generation prompt
│   └── export-utils.ts       # Export helper functions
├── public/
│   └── examples/             # Example PRDs
├── .env.example              # Environment variables template
└── README.md                 # This file
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with:

```env
# Required: Your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional: Customize AI model
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Optional: Coder1 IDE handoff URL
CODER1_IDE_URL=https://coder1.dev/ide
```

### Customization

**Change the Questions**: Edit `lib/prd-template.ts` to customize the 5 questions

**Modify PRD Format**: Update the AI prompt in `app/api/generate/route.ts`

**Add Export Formats**: Extend `lib/export-utils.ts` with new formats (e.g., DOCX)

**Customize Styling**: Edit `app/globals.css` or Tailwind configuration

---

## 🎯 Example PRDs

Check out `public/examples/` for sample PRDs generated by the tool:

- **SaaS Example**: Project management tool for remote teams
- **Mobile App Example**: Fitness tracking with AI coaching
- **E-commerce Example**: Sustainable fashion marketplace

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Ways to Contribute

- **Report Bugs**: Open an issue with details and reproduction steps
- **Suggest Features**: Share ideas for improvements
- **Improve Questions**: Propose better strategic questions
- **Add Export Formats**: Implement new export options (DOCX, HTML, etc.)
- **Translate**: Help make the tool available in other languages
- **Write Docs**: Improve README, add tutorials, create videos

### Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly (PRD generation, exports, handoff)
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**TL;DR**: You can use, modify, and distribute this code freely. Commercial use is allowed. Just keep the copyright notice.

---

## 🙋 FAQ

### Is this really free?

Yes! 100% free, no hidden costs, no premium tiers. We make money from the Coder1 IDE (optional), not the PRD Generator.

### Do I need an Anthropic API key?

- **Using the live version**: No, we handle the API calls
- **Running locally**: Yes, you'll need your own key ([get one here](https://console.anthropic.com/))

### What AI model does it use?

Claude Sonnet 4 by default. You can configure this in `.env.local` if running locally.

### Can I use this for commercial projects?

Absolutely! MIT license allows commercial use.

### How do I get support?

- **GitHub Issues**: For bugs and feature requests
- **Community**: Join our [community discussions](https://github.com/MichaelrKraft/coder1-community/discussions)
- **Email**: support@coder1.dev for urgent issues

### What's the "Launch in Coder1 IDE" button?

After generating your PRD, you can optionally launch it in our IDE to start building immediately. The IDE has:
- Multi-LLM switching (Claude + Gemini)
- Eternal Memory (AI remembers everything)
- 7-day free trial, then $29/mo

The IDE is separate from this tool - the PRD Generator is 100% free regardless.

---

## 🔗 Related Projects

- **[Coder1 IDE](https://github.com/MichaelrKraft/coder1-ide)** - The development environment (frontend)
- **[Coder1 Community](https://github.com/MichaelrKraft/coder1-community)** - Community support & showcase

---

## 🌟 Show Your Support

If this tool helped you, please:
- ⭐ Star this repository
- 🐦 Share on Twitter with #Coder1
- 📝 Write a blog post about your experience
- 🤝 Contribute improvements

---

## 📊 Stats

- **Generation Time**: ~30-60 seconds per PRD
- **Average PRD Length**: 2,000-3,000 words
- **Supported Languages**: English (more coming soon)
- **Export Formats**: 3 (Markdown, JSON, PDF)

---

## 🗺️ Roadmap

### Coming Soon
- [ ] Multi-language support (Spanish, French, German)
- [ ] PRD templates for different industries (SaaS, Mobile, E-commerce)
- [ ] Collaboration features (share PRD link, comment)
- [ ] Version history (track PRD iterations)
- [ ] Integration with project management tools (Jira, Linear)

### Maybe Later
- [ ] Voice input (describe your product via audio)
- [ ] Image/wireframe upload (PRD from visual mockups)
- [ ] Competitive analysis (AI researches competitors)
- [ ] Market sizing (AI estimates TAM/SAM/SOM)

**Want to see something here?** Open an issue and let us know!

---

## 💬 Testimonials

> "I've written hundreds of PRDs manually. This tool would have saved me weeks of work." - Sarah K., Product Manager

> "As a non-technical founder, this helped me articulate my vision clearly to developers." - Mike R., Startup Founder

> "The 5 questions force you to think strategically. The PRD output is comprehensive." - David L., Engineering Lead

*(Want to add yours? Open a PR!)*

---

## 🙏 Acknowledgments

Built with:
- [Next.js 14](https://nextjs.org/) - React framework
- [Anthropic Claude](https://www.anthropic.com/) - AI that generates PRDs
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Vercel](https://vercel.com/) - Hosting

Special thanks to the open source community for inspiration and tools.

---

## 📞 Contact

- **Website**: [coder1.dev](https://coder1.dev)
- **Email**: support@coder1.dev
- **Twitter**: [@Coder1Dev](https://twitter.com/Coder1Dev)
- **Community**: [GitHub Discussions](https://github.com/MichaelrKraft/coder1-community/discussions)

---

**Made with ❤️ by the Coder1 team**

*Helping vibe coders go from idea to profitable business*
