# SAMADHAAN Design System & Aesthetic Specification (UX4G Standard)

## 1. Aesthetic Direction
- **Identity**: Official Digital Service for the Government of India / Alliance India National TB Elimination Program (NTEP).
- **Tone**: Authoritative, trustworthy, highly accessible, clean, and modern.
- **Inspiration**: Government of India **UX4G** Design System (`ux4g.gov.in`), Survey Setu, and GIGW 3.0 (Guidelines for Indian Government Websites).
- **Strict Anti-Patterns**:
  - NO generic "AI purple gradients" (`#7c3aed`, `#6366f1` mesh gradients).
  - NO cluttered, unformatted data tables.
  - NO low-contrast grey-on-white text that fails accessibility for field workers on mobile screens in sunlight.

---

## 2. Color Palette & CSS Tokens

```css
:root {
  /* Government of India Official Identity Tokens */
  --gov-primary: #1e40af;       /* Ashoka Chakra Deep Navy Blue */
  --gov-primary-hover: #1e3a8a; /* Darker Navy for interactive states */
  --gov-secondary: #16a34a;     /* India Green (NTEP Treatment Success) */
  --gov-accent: #ff9933;        /* Saffron / Alert / Pending Attention */
  
  /* Neutral & Functional Surfaces */
  --gov-surface: #ffffff;       /* Clean White card/modal background */
  --gov-surface-subtle: #f8fafc;/* Off-white background for zebra rows & sidebars */
  --gov-surface-card: #f1f5f9;  /* Border / Card container surface */
  --gov-text: #0f172a;          /* High-Contrast Charcoal (AAA accessibility) */
  --gov-text-muted: #475569;    /* Secondary text */
  --gov-border: #cbd5e1;        /* Crisp border for inputs & tables */

  /* Clinical Status Badges */
  --status-screened: #0284c7;   /* Sky Blue */
  --status-suspected: #ef4444;  /* Crimson Red */
  --status-referred: #f59e0b;   /* Amber */
  --status-on-att: #8b5cf6;     /* Purple / On Therapy */
  --status-completed: #10b981;  /* Emerald Green / Cured */
}

/* High Contrast Mode (Mandatory for GIGW 3.0) */
[data-contrast="high"] {
  --gov-surface: #000000;
  --gov-surface-subtle: #121212;
  --gov-text: #ffff00;          /* Yellow on Black for maximum readability */
  --gov-border: #ffffff;
  --gov-primary: #ffd700;
}
```

---

## 3. Typography
- **Primary Typeface**: `'Inter', 'Noto Sans', sans-serif`
- **Indic Script Support (Hindi/Devanagari)**: `'Noto Sans Devanagari', sans-serif`
- **Scale**:
  - `Display / H1`: 2rem (32px), SemiBold 600, tight tracking.
  - `H2 / Section Title`: 1.5rem (24px), Medium 500.
  - `Body`: 0.9375rem (15px), Regular 400, line-height 1.6.
  - `Data / Table Cells`: 0.875rem (14px), Mono numerals for alignment (`tabular-nums`).
- **Dynamic Font Scaling**:
  - Accessible sizing controls: `100% (default)`, `125%`, `150%`, `175%`, `200%` without layout breaking.

---

## 4. Key UI Components & Layout Guidelines
1. **GovAccessibilityToolbar**:
   - Fixed at the very top of the viewport above the main header.
   - Contains: Skip to main content link, Font Resizer (`A-`, `A`, `A+`), High-Contrast Toggle, Bilingual Switcher (`EN` | `हिंदी`).
2. **National Header / Brand Strip**:
   - Ashoka Chakra / Alliance India badge on deep blue header with gold accent underline.
   - User profile dropdown with active role badge (`Prison Coordinator`, `DTO`, `State Program Manager`, `Admin`).
3. **Optimized Virtualized Data Table**:
   - Sticky headers with sort indicators.
   - Compact row heights (40px) with subtle hover highlight.
   - Quick action triggers: Edit, View Timeline, Push to Google Sheets, Generate Card.
4. **Register Upload Wizard**:
   - 3-step progress bar (Facility Details -> Scan/OCR Upload -> Verification & Commit).
   - Clear error highlights and inline duplicate warnings.

---

## 5. Design Reference Links
- [UX4G Component Guidelines](https://ux4g.gov.in)
- [GIGW 3.0 Accessibility Standards](https://guidelines.gov.in)
- [Survey Setu Design Reference](https://surveysetu.gov.in)
