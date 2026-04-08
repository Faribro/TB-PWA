# Knowledge Articles Seeding Guide

## Quick Start

Seed all 42 articles to your Supabase database:

```bash
bun run seed:knowledge
```

## What It Does

The seeding script:
1. ✅ Connects to Supabase using service role key
2. ✅ Checks for existing articles (prevents duplicates)
3. ✅ Generates professional content for each article
4. ✅ Inserts articles with proper metadata
5. ✅ Reports success/failure for each article

## Prerequisites

Ensure these environment variables are set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://wwcgybgvfulotflitogu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Expected Output

```
═══════════════════════════════════════════════════════════════════════════
📚 KNOWLEDGE ARTICLES DATABASE SEEDER
═══════════════════════════════════════════════════════════════════════════
🔗 Supabase URL: https://wwcgybgvfulotflitogu.supabase.co

📁 Collection: Getting Started
  📂 Section: Platform Overview
    ✅ What Is Samadhaan
    ✅ System Architecture
    ✅ Role Guide
  📂 Section: Your First Day
    ✅ Logging In
    ✅ Command Hub Overview
    ✅ Navigating Sidebar

📁 Collection: Module Guides
  📂 Section: Command Hub
    ✅ Command Hub Page
    ✅ Reading Kpi Dashboard
    ✅ Screening Journey Cube
    ✅ Patient Timeline
  📂 Section: Follow-Up Pipeline
    ✅ Pipeline Overview
    ✅ How To Triage
    ✅ Initiated Completed Workflow
    ✅ Understanding Ltfu
  📂 Section: Analytics
    ✅ Analytics Overview
    ✅ Screening Velocity
    ✅ Ai Confidence Score
    ✅ Exporting Reports
  📂 Section: GIS Intelligence
    ✅ Map Overview
    ✅ Hotspot Overlays
    ✅ District Drill Down
  📂 Section: M&E Tools
    ✅ Mne Overview
    ✅ Targets And Progress
    ✅ Mne Reports
  📂 Section: Identity Bureau
    ✅ User Roles Permissions
    ✅ Creating Managing Users
    ✅ State District Assignments

📁 Collection: Clinical Protocols
  📂 Section: TB Screening Protocol
    ✅ Five Day Pathway
    ✅ Barrack Deployment Sop
    ✅ Xray Capture Standards
    ✅ Ai Flagging Thresholds
  📂 Section: Confirmatory Testing
    ✅ Cbnaat Truenat Protocol
    ✅ Sputum Collection
    ✅ Result Interpretation
  📂 Section: Treatment & Enrollment
    ✅ Rntcp Enrollment
    ✅ Dots Therapy
    ✅ Nikshay Notification

📁 Collection: Technical Reference
  📂 Section: Data & Sync
    ✅ Live Sync
    ✅ Data Quality Indicators
    ✅ Offline Mode
  📂 Section: AI Engine
    ✅ How Ai Works
    ✅ Confidence Bands
    ✅ Model Limitations
  📂 Section: Integrations
    ✅ Kobo Integration
    ✅ Azure Architecture
    ✅ Google Sheets Sync

═══════════════════════════════════════════════════════════════════════════
📊 SEEDING SUMMARY
═══════════════════════════════════════════════════════════════════════════
Total Articles:  42
✅ Created:      42
⏭️  Skipped:      0
❌ Errors:       0
Success Rate:    100.0%

🎉 All articles seeded successfully!
```

## Running Multiple Times

The script is **idempotent** - safe to run multiple times:

```bash
# First run: Creates all 42 articles
bun run seed:knowledge

# Second run: Skips existing articles
bun run seed:knowledge
```

Output on second run:
```
Total Articles:  42
✅ Created:      0
⏭️  Skipped:      42
❌ Errors:       0

ℹ️  All articles already exist in database
```

## Troubleshooting

### Error: SUPABASE_SERVICE_ROLE_KEY not found

**Solution:** Add the key to `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Error: Connection refused

**Solution:** Check Supabase URL is correct:
```env
NEXT_PUBLIC_SUPABASE_URL=https://wwcgybgvfulotflitogu.supabase.co
```

### Error: Permission denied

**Solution:** Ensure you're using the **service role key**, not the anon key.

### Error: Duplicate key value violates unique constraint

**Solution:** Article already exists. Script will skip it automatically.

## Manual Verification

After seeding, verify in Supabase dashboard:

1. Go to Table Editor
2. Select `knowledge_articles` table
3. Should see 42 rows
4. Check `is_published = true` for all

## Production Deployment

For production environment:

```bash
# Set production credentials
export NEXT_PUBLIC_SUPABASE_URL=<prod-url>
export SUPABASE_SERVICE_ROLE_KEY=<prod-key>

# Run seeding
bun run seed:knowledge
```

## Article Structure

Each seeded article includes:

- **Title** - Human-readable title from slug
- **Slug** - URL-friendly identifier
- **Content** - Markdown-formatted documentation
- **Excerpt** - First 150 characters for previews
- **Type** - 'guide' (default)
- **Visibility** - 'all' (accessible to everyone)
- **Creator** - 'System' / 'admin'
- **Published** - true (immediately available)
- **Display Order** - Sequential ordering
- **Collection ID** - Parent collection reference
- **Section ID** - Parent section reference

## Customization

To modify generated content, edit `scripts/seed-knowledge-articles.ts`:

```typescript
const generateContent = (slug: string, collectionLabel: string, sectionLabel: string) => {
  // Customize content template here
  return `# ${titleFromSlug(slug)}
  
  Your custom content...`
}
```

## Support

For issues or questions:
- Check `docs/KNOWLEDGE_HUB_COMPLETE.md` for full documentation
- Review script output for specific error messages
- Verify environment variables are set correctly
- Ensure Supabase project is active and accessible

---

**Script Location:** `scripts/seed-knowledge-articles.ts`  
**Package Command:** `bun run seed:knowledge`  
**Last Updated:** January 21, 2025
