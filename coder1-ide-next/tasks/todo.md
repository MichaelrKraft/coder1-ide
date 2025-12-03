# Task: Match Coder1 Homepage UI to ReddRider UI Style

## Current State Analysis

### ReddRider UI (Target Style)
- Clean, minimal light gray gradient background (`#d6dbdc` to white)
- Centered layout with generous whitespace
- Single prominent title with emoji (`🤖 Reddit Automation Platform`)
- Simple subtitle text
- One prominent orange CTA button (`Go to Dashboard →`)
- 6 feature cards in a 3x2 grid layout
- Cards have light gray borders, padding, emoji icons
- Monospace font (`font-mono`)
- Footer with tech stack info
- NO complex animations, NO gradients in buttons, NO glass morphism

### Coder1 Current UI
- Complex dark background with dot-grid pattern
- Animated logo with glow effects
- Typewriter text animation cycling through phrases
- Gradient text subtitle
- 3 glass-morphic buttons with complex hover states
- Heavy use of blur effects and shadows
- Multiple entrance animations

## Plan

### Phase 1: Simplify Background
- [ ] Remove dot-grid background
- [ ] Remove FaultyTerminal animation
- [ ] Add simple light gray gradient background (like ReddRider)

### Phase 2: Simplify Header
- [ ] Remove typewriter animation - use static title
- [ ] Remove logo glow animation  
- [ ] Simplify title styling to match ReddRider

### Phase 3: Update Button Styling
- [ ] Remove glass-morphism effects
- [ ] Add single prominent CTA button (solid color like ReddRider orange)
- [ ] Keep secondary actions but simplify their styling

### Phase 4: Add Feature Cards Grid
- [ ] Create 6 feature cards matching ReddRider layout
- [ ] Use emoji + title + description format
- [ ] Light border styling, no shadows

### Phase 5: Clean Up
- [ ] Remove complex hover animations
- [ ] Use monospace font for headers
- [ ] Add tech stack footer

## Files to Modify
1. `/components/HeroSection.tsx` - Main UI changes
2. `/app/globals.css` - Background and base styles (if needed)

## Review
_To be completed after implementation_
