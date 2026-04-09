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
      "heading": "TBD — Problem headline",
      "body": "TBD — Problem description (filled in Task 17).",
      "animation": "slide-left",
      "enter": 18,
      "leave": 32
    },
    {
      "id": "solution",
      "label": "002 / Clarity Test",
      "heading": "TBD — Solution headline",
      "body": "TBD — Solution description (filled in Task 17).",
      "animation": "slide-right",
      "enter": 34,
      "leave": 48
    },
    {
      "id": "why-now",
      "label": "003 / Timing Test",
      "heading": "TBD — Why now",
      "body": "TBD — Timing thesis (filled in Task 17).",
      "animation": "scale-up",
      "enter": 50,
      "leave": 60
    },
    {
      "id": "market",
      "label": "004 / Math Test",
      "heading": "TBD — Market headline",
      "body": "TBD — TAM/SAM/SOM description (filled in Task 17).",
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
      "heading": "TBD — Traction headline",
      "body": "TBD — Traction narrative (filled in Task 17).",
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
      "heading": "TBD — GTM + Team headline",
      "body": "TBD — GTM strategy and team strengths (filled in Task 17).",
      "animation": "rotate-in",
      "enter": 84,
      "leave": 90
    },
    {
      "id": "ask",
      "label": "007 / The Ask",
      "heading": "TBD — The Ask headline",
      "body": "TBD — Funding ask and use of funds (filled in Task 17).",
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
