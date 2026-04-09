window.DECK_CONFIG = {
  "company": "Coder1 IDE",
  "tagline": "The Agentic IDE for Claude Code Users",
  "hero": {
    "heading": [
      "The",
      "IDE",
      "Claude",
      "Code",
      "Deserves"
    ],
    "founderCutout": {
      "enabled": true,
      "videoPath": "/deck/media/founder-cutout.webm",
      "fallbackImage": "/deck/media/founder-fallback.jpg",
      "playByDefault": false
    }
  },
  "sections": [
    {
      "id": "problem",
      "label": "001 / Pain Test",
      "heading": "Claude Code is the most powerful AI coding tool ever built — and it has no home.",
      "body": "Millions of developers use Claude Code every day. They run it in terminal windows, hack it into VS Code, and lose context between sessions. The most capable agentic coding model on earth is still living in someone else’s IDE. No purpose-built environment. No team collaboration. No persistent memory. No local-first security.",
      "animation": "slide-left",
      "enter": 18,
      "leave": 32
    },
    {
      "id": "solution",
      "label": "002 / Clarity Test",
      "heading": "Coder1 is the first agentic IDE built for Claude Code users.",
      "body": "Purpose-built from day one for how Claude Code actually works. A live preview that stays in sync with what the agent is building. A multi-user editing model like Google Docs. An agent hub that orchestrates background work on your machine. Cross-session memory that carries context forward. And it runs locally — bridging into your own Claude Code subscription instead of routing through somebody else’s cloud.",
      "animation": "slide-right",
      "enter": 34,
      "leave": 48
    },
    {
      "id": "why-now",
      "label": "003 / Timing Test",
      "heading": "The agentic IDE category is forming right now. There is no incumbent.",
      "body": "Claude Code crossed 4.4M users in 18 months. Anthropic just launched enterprise tiers. Cursor and Windsurf are general-purpose AI IDEs chasing autocomplete. Nobody is building specifically for the agentic workflow — the one where the AI runs the loop and the human steers. First-mover advantage is measured in weeks, not quarters.",
      "animation": "scale-up",
      "enter": 50,
      "leave": 60
    },
    {
      "id": "market",
      "label": "004 / Math Test",
      "heading": "A multi-billion-dollar tooling market at an inflection point.",
      "body": "$8.4B developer tooling TAM. 4.4M Claude Code users as our SAM — power users willing to pay for the right workflow. At a $240 ARPU target and a conservative 10% penetration, that’s a $264M serviceable obtainable market we can reach without leaving the Claude Code community.",
      "animation": "clip-reveal",
      "enter": 62,
      "leave": 72,
      "stats": [
        {
          "value": 8.4,
          "suffix": "B",
          "label": "Dev tooling TAM",
          "decimals": 1
        },
        {
          "value": 4.4,
          "suffix": "M",
          "label": "Claude Code users",
          "decimals": 1
        },
        {
          "value": 264,
          "suffix": "M",
          "label": "SOM at 10% capture",
          "decimals": 0
        }
      ]
    },
    {
      "id": "traction",
      "label": "005 / Evidence Test",
      "heading": "Users are showing up organically — and they’re staying.",
      "body": "Growth is 100% community-driven. No paid acquisition, no outbound, no SEO. Just Claude Code power users finding Coder1 on YouTube and Twitter and telling their teams. 94% of users who sign up are still active at 30 days. NPS is 72. The signal is clear: once developers feel the agentic IDE, going back to a static editor feels like a downgrade.",
      "animation": "stagger-up",
      "enter": 74,
      "leave": 82,
      "stats": [
        {
          "value": 12400,
          "label": "Active users",
          "decimals": 0
        },
        {
          "value": 2,
          "suffix": "M ARR",
          "label": "Annual recurring revenue",
          "decimals": 1
        },
        {
          "value": 340,
          "suffix": "% YoY",
          "label": "Growth",
          "decimals": 0
        },
        {
          "value": 94,
          "suffix": "%",
          "label": "30-day retention",
          "decimals": 0
        }
      ]
    },
    {
      "id": "gtm-team",
      "label": "006 / Founder-Market Fit",
      "heading": "Built by a founder who lives inside Claude Code every day.",
      "body": "Mike Kraft has shipped three SaaS products in the last 24 months using Claude Code as his primary developer. He built Coder1 to solve his own workflow first — every feature is the answer to a frustration he hit before it was a roadmap item. GTM is a continuation of that: bottom-up through the Claude Code YouTube community, a co-marketing track with Anthropic, and an affiliate program with power-user educators.",
      "animation": "rotate-in",
      "enter": 84,
      "leave": 90
    },
    {
      "id": "ask",
      "label": "007 / The Ask",
      "heading": "Raising $2.5M Seed to own the agentic IDE category.",
      "body": "60% engineering (3 hires: a senior full-stack engineer, a DX specialist, and a developer advocate). 25% go-to-market (content production, affiliate ops, community events). 15% runway and operations. The goal for the round: 50K active users and $8M ARR within 18 months, setting up a Series A led by a category defining infrastructure fund.",
      "animation": "fade-up",
      "enter": 92,
      "leave": 100,
      "persist": true,
      "cta": {
        "label": "Chat with Mike",
        "action": "openChat"
      }
    }
  ],
  "marquee": {
    "text": "BUILT · FOR · CLAUDE · CODE · USERS",
    "fontSize": "14vw",
    "speed": -25
  },
  "features": {
    "roiCalculator": true,
    "feedbackBox": true,
    "chatWidget": true,
    "analytics": true
  },
  "roiCalculator": {
    "insertAfter": "market",
    "defaults": {
      "developers": 12,
      "hoursSavedPerWeek": 8,
      "costPerHour": 150
    },
    "formulaSource": "(d, h, c) => d * h * c * 52"
  },
  "founder": {
    "name": "Mike Kraft",
    "title": "Founder · Coder1 IDE"
  },
  "productDemoFrames": 0
};
