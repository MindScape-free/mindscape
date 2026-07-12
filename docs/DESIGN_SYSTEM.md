# 🎨 MindScape — Design System

This document catalogs the visual design tokens, component patterns, and interaction guidelines for MindScape's UI.

---

## 🎯 Design Principles

1. **Clarity over complexity** — Knowledge visualization should reduce cognitive load, not increase it
2. **Depth through layering** — Use shadow, glassmorphism, and color to establish visual hierarchy
3. **Motion with purpose** — Animations guide attention, not distract
4. **Accessible by default** — Contrast ratios, keyboard support, screen reader compatibility
5. **Dark-first** — The interface is designed for dark environments (studying, late-night research)

---

## 🌈 Color System

### Core Palette

Colors are defined as CSS custom properties in `globals.css` using HSL values for dynamic theme support.

```css
:root {
  /* Background & Surfaces */
  --background: 240 10% 3.9%;       /* Near-black: #09090B */
  --foreground: 0 0% 98%;            /* Near-white: #FAFAFA */
  --card: 240 10% 5.9%;             /* Dark card: #0F0F12 */
  --card-foreground: 0 0% 98%;
  --popover: 240 10% 5.9%;
  --popover-foreground: 0 0% 98%;

  /* Primary — The MindScape signature */
  --primary: 267 75% 60%;            /* Vivid purple: #8B5CF6 */
  --primary-foreground: 0 0% 98%;
  --primary-dark: 267 60% 45%;

  /* Secondary */
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;

  /* Muted — Secondary text & borders */
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;

  /* Accent — Highlights & interactive elements */
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;

  /* Destructive — Errors & warnings */
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;

  /* Borders & Inputs */
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 267 75% 60%;              /* Focus ring matches primary */

  /* Radius */
  --radius: 0.75rem;
}
```

### Semantic Colors

| Token | Value | Usage |
|---|---|---|
| `--primary` | `hsl(267 75% 60%)` | Buttons, links, active states, focus rings |
| `--primary-dark` | `hsl(267 60% 45%)` | Hover states on primary backgrounds |
| `--destructive` | `hsl(0 62.8% 30.6%)` | Delete buttons, error messages |
| `--muted-foreground` | `hsl(240 5% 64.9%)` | Secondary text, labels, placeholders |

### Mind Map Depth Colors

| Depth | Badge Color | Border Color | Meaning |
|---|---|---|---|
| **Quick (low)** | `text-emerald-400` | `border-emerald-500/30` | Shallow overview, <30 nodes |
| **Balanced (medium)** | `text-amber-400` | `border-amber-500/30` | Moderate depth, 60-90 nodes |
| **Detailed (deep)** | `text-purple-400` | `border-purple-500/30` | Deep dive, 100+ nodes |

### Rank Colors (Gamification)

| Rank | Color | Hex |
|---|---|---|
| Spark (1) | `text-zinc-400` | `#A1A1AA` |
| Thinker (2) | `text-blue-400` | `#60A5FA` |
| Explorer (3) | `text-emerald-400` | `#34D399` |
| Mapper (4) | `text-violet-400` | `#A78BFA` |
| Architect (5) | `text-amber-400` | `#FBBF24` |
| Scholar (6) | `text-sky-400` | `#38BDF8` |
| Sage (7) | `text-purple-400` | `#C084FC` |
| Luminary (8) | `text-rose-400` | `#FB7185` |
| Oracle (9) | `text-orange-400` | `#FB923C` |
| MindMaster (10) | `text-yellow-400` | `#FACC15` |

---

## 🔤 Typography

### Fonts

| Font | Weight | Usage | Source |
|---|---|---|---|
| **Space Grotesk** | 400, 500, 700 | Body text, UI labels, paragraphs | Google Fonts (preloaded) |
| **Orbitron** | 700, 900 | Headlines, logo, hero titles | Google Fonts (preloaded) |
| **Monospace** | 400 | Code blocks, inline code | System default |

### Font Sizes (Tailwind Scale)

```css
/* Body text */
.text-xs  /* 0.75rem / 12px */
.text-sm  /* 0.875rem / 14px */
.text-base /* 1rem / 16px — default body */
.text-lg  /* 1.125rem / 18px */
.text-xl  /* 1.25rem / 20px */

/* Headings */
.text-2xl /* 1.5rem / 24px — Section headings */
.text-3xl /* 1.875rem / 30px — Page headings */
.text-4xl /* 2.25rem / 36px — Hero titles */
.text-5xl /* 3rem / 48px — Large hero */
```

### Font Usage Guidelines

| Element | Font | Size | Weight |
|---|---|---|---|
| Page title (h1) | Orbitron | 3xl-5xl | 700 |
| Section heading (h2) | Space Grotesk | 2xl-3xl | 700 |
| Card title (h3) | Space Grotesk | lg-xl | 500 |
| Body text | Space Grotesk | base | 400 |
| Small/caption | Space Grotesk | xs-sm | 400 |
| Code | Monospace | sm | 400 |
| Logo | Orbitron | xl-2xl | 900 |
| Buttons | Space Grotesk | sm-base | 500 |

---

## 📐 Spacing System

Based on Tailwind's default spacing scale:

```css
/* Core spacing */
.gap-1   /* 4px */
.gap-2   /* 8px — tight spacing */
.gap-3   /* 12px */
.gap-4   /* 16px — default spacing */
.gap-6   /* 24px — section spacing */
.gap-8   /* 32px — major sections */
.gap-12  /* 48px — page sections */

/* Padding */
.p-4     /* 16px — card padding */
.p-6     /* 24px — section padding */
.p-8     /* 32px — page padding */
```

---

## 💡 Key Components

### Glassmorphism Effect

```css
.glassmorphism {
  background: hsl(var(--card) / 0.5);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border));
}
```

Used for: Navbar, modals, floating panels

### Neo-Convex Buttons

```css
.neo-convex {
  background: linear-gradient(
    135deg,
    hsl(var(--primary) / 0.2),
    hsl(var(--primary) / 0.05)
  );
  box-shadow:
    0 2px 8px -1px hsl(var(--primary) / 0.2),
    inset 0 1px 0 hsl(var(--primary) / 0.1);
}
```

Used for: Primary action buttons, generate buttons

### Cards

```css
.card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  box-shadow: 0 1px 3px hsl(0 0% 0% / 0.1);
}
```

---

## 🎞️ Animations & Motion

### Framer Motion Presets

```typescript
// Fade in
const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// Scale in (modals)
const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// Slide from right (chat panel)
const slideRight = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
};
```

### Animation Patterns

| Interaction | Animation | Duration | Easing |
|---|---|---|---|
| Page transitions | Fade + slight slide up | 300ms | ease-out |
| Modal open | Scale in + fade | 200ms | ease-out |
| Chat panel | Slide from right | 300ms | ease-in-out |
| Accordion expand | Height transition | 200ms | ease-out |
| Toast notification | Slide down + fade | 300ms | ease-out |
| Hover (buttons) | Scale 1.02 + shadow | 150ms | ease-out |
| Node expand | Accordion height | 200ms | ease-out |

### Micro-interactions

- **Button press**: Scale to 0.97, shadow reduces
- **Selection highlight**: Slow pulse on active mind map node
- **XP toast**: Float upward + fade, "+15 XP" animation
- **Level up**: Confetti particle burst overlay
- **Loading state**: Neural network pulse animation (`NeuralLoader`)

---

## 📱 Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|---|---|---|
| **Mobile** | < 640px | Single column, collapsible nav, stacked panels |
| **Tablet** | 640-1024px | Two-column, side chat becomes bottom sheet |
| **Desktop** | > 1024px | Full layout: toolbar + map + chat panel |
| **Wide** | > 1536px | Max-width containers, larger node text |

### Mobile-Specific Patterns

- Navbar collapses to hamburger menu
- Source selection becomes a bottom sheet
- Chat panel opens as full-screen overlay
- Mind map nodes are larger touch targets (min 44px)
- Toolbar wraps to two rows
- Dialog modals use full-screen on mobile

---

## 🖼️ Iconography

Icons use **Lucide React** throughout. Key mappings:

| Concept | Icon Component |
|---|---|
| Mind map | `BrainCircuit` |
| Chat | `MessageSquare` |
| Quiz | `HelpCircle` / `BrainCircuit` |
| Image | `Image` |
| Audio | `Volume2` |
| Share | `Share2` |
| Save | `Save` |
| Translate | `Globe` |
| Compare | `GitCompare` |
| Expand | `Expand` |
| Pin | `Pin` |
| Search | `Search` |
| Settings | `Settings` |
| User | `User` / `UserCircle` |
| XP/Points | `Zap` |
| Rank | `Trophy` / `Award` / `Medal` |
| AI | `Sparkles` / `Brain` |

---

## ♿ Accessibility

### Color Contrast

- **Text on background**: Minimum 4.5:1 ratio (meets WCAG AA)
- **Large text (18px+ bold, 24px+)**: Minimum 3:1 ratio
- **Interactive elements**: Visible focus ring (`--ring` color)
- **Don't rely on color alone**: Use icons + text labels for status

### Focus Management

- All interactive elements have visible focus rings
- Dialogs trap focus within them
- Chat panel auto-focuses input when opened
- Keyboard navigation enabled for mind map nodes (Tab + Enter/Space)

### Reduced Motion

- Check `prefers-reduced-motion` media query
- Disable parallax and complex animations
- Use `motion.safe` variant in Framer Motion (not yet implemented — planned)

---

## 🛠️ Custom Tailwind Classes

Defined in `globals.css`:

```css
@layer components {
  .glassmorphism { /* Glassmorphism surface */ }
  .neo-convex { /* Convex gradient surface */ }
  .neo-button { /* Interactive button surface */ }
  .text-gradient { /* Gradient text */ }
  .glow { /* Primary glow effect */ }
}
```

### Utility Animations

```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px hsl(var(--primary) / 0.3); }
  50% { box-shadow: 0 0 30px hsl(var(--primary) / 0.5); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```
