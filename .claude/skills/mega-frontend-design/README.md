# MEGA Frontend Design Skill

> A Claude Code skill that produces Awwwards-worthy, production-ready UI. Not a developer making a UI — a craftsman who happens to also write perfect code.

## What This Is

A **Claude Code custom skill** that transforms how Claude builds frontend interfaces. Instead of generic, template-looking output, this skill enforces:

- 10 aesthetic archetypes (Editorial, Swiss, Brutalist, Minimalist, Maximalist, Retro-Futuristic, Organic, Industrial, Art Deco, Lo-Fi)
- Full animation library patterns (GSAP, Framer Motion, Lenis, Three.js, CSS scroll-driven animations)
- Design intelligence tables (archetype by product type, font by goal)
- Complete design token system (typography, color via oklch, spacing, motion)
- Arabic/RTL full support with proper font stacks and layout rules
- Anti-pattern blacklist (eliminates generic AI slop)
- Production checklist and 7-phase workflow

## Installation

### Option 1: Claude Code CLI (Recommended)

```bash
claude skill add --from https://github.com/FerasMahmoud/mega-frontend-design
```

### Option 2: Manual Installation

1. Create the skill directory:
```bash
mkdir -p ~/.claude/skills/mega-frontend-design
```

2. Copy `SKILL.md` into that directory:
```bash
cp SKILL.md ~/.claude/skills/mega-frontend-design/SKILL.md
```

3. Restart Claude Code.

## Usage

The skill activates automatically when you ask Claude Code to build any frontend/UI work:

```
> Build me a SaaS landing page
> Create a dashboard component
> Design a portfolio website
> Make a product card with animations
```

Or invoke it explicitly:

```
> /mega-frontend-design build a pricing page
```

## What's Inside

| Section | What It Covers |
|---------|---------------|
| **Mindset** | Design thinking framework, opinion-driven approach |
| **10 Archetypes** | Editorial, Swiss, Brutalist, Minimalist, Maximalist, Retro-Futuristic, Organic, Industrial, Art Deco, Lo-Fi + 2026 bonus styles |
| **Anti-Slop Rules** | 20+ patterns to avoid (no Inter heroes, no purple gradients, no emoji icons) |
| **Design Intelligence** | Archetype-by-product tables, font-by-goal tables, reference design systems |
| **Token System** | Fluid typography, oklch colors, spacing, motion easing + duration |
| **GSAP Patterns** | Hero reveals, scroll triggers, parallax, counters, magnetic elements, custom cursors |
| **Lenis** | Smooth scroll integration with GSAP ticker |
| **Framer Motion** | React patterns: viewport reveals, stagger, magnetic buttons, parallax, page transitions |
| **CSS Effects** | Scroll-driven animations, glassmorphism, mesh gradients, grain overlay, spotlight hover, marquee |
| **Three.js** | Hero background with morphing geometry |
| **Layout** | Bento grid, fluid auto grid, subgrid, container queries |
| **Arabic/RTL** | Full guide: fonts, typography rules, logical properties, bidi handling, GSAP in RTL, cultural considerations |
| **Performance** | GPU compositing rules, will-change management |
| **Signature Moves** | 12 obsessive details that make output not generic |
| **Workflow** | 7-phase process from intention to responsive check |
| **Checklist** | Production readiness verification |

## Before & After

**Without the skill:** Generic layouts, Inter font, purple gradients, emoji icons, template-looking output.

**With the skill:** Intentional design decisions, proper typography hierarchy, custom animations, grain textures, magnetic interactions, scroll-driven reveals — output that looks like it was built by a senior designer.

## License

MIT — use it, share it, modify it.

## Credits

Built by [Feras Mahmoud](https://github.com/FerasMahmoud) for Claude Code.
