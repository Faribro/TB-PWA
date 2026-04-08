/**
 * Knowledge Articles Database Seeder
 * Seeds all 42 articles from COLLECTIONS into Supabase
 * Run: bun run scripts/seed-knowledge-articles.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wwcgybgvfulotflitogu.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const COLLECTIONS = [
  { id: 'getting-started', label: 'Getting Started', accent: '#10b981', sections: [{ id: 'platform-overview', label: 'Platform Overview', slugs: ['what-is-samadhaan', 'system-architecture', 'role-guide'] }, { id: 'first-day', label: 'Your First Day', slugs: ['logging-in', 'home-overview', 'navigating-sidebar'] }] },
  { id: 'module-guides', label: 'Module Guides', accent: '#6366f1', sections: [{ id: 'home', label: 'Home', slugs: ['home-page', 'reading-kpi-dashboard', 'screening-journey-cube', 'patient-timeline'] }, { id: 'pipeline', label: 'Follow-Up Pipeline', slugs: ['pipeline-overview', 'how-to-triage', 'initiated-completed-workflow', 'understanding-ltfu'] }, { id: 'analytics', label: 'Analytics', slugs: ['analytics-overview', 'screening-velocity', 'ai-confidence-score', 'exporting-reports'] }, { id: 'gis', label: 'GIS Intelligence', slugs: ['map-overview', 'hotspot-overlays', 'district-drill-down'] }, { id: 'mne', label: 'M&E Tools', slugs: ['mne-overview', 'targets-and-progress', 'mne-reports'] }, { id: 'identity', label: 'Identity Bureau', slugs: ['user-roles-permissions', 'creating-managing-users', 'state-district-assignments'] }] },
  { id: 'clinical-protocols', label: 'Clinical Protocols', accent: '#f43f5e', sections: [{ id: 'tb-screening', label: 'TB Screening Protocol', slugs: ['five-day-pathway', 'barrack-deployment-sop', 'xray-capture-standards', 'ai-flagging-thresholds'] }, { id: 'confirmatory', label: 'Confirmatory Testing', slugs: ['cbnaat-truenat-protocol', 'sputum-collection', 'result-interpretation'] }, { id: 'treatment', label: 'Treatment & Enrollment', slugs: ['rntcp-enrollment', 'dots-therapy', 'nikshay-notification'] }] },
  { id: 'technical', label: 'Technical Reference', accent: '#8b5cf6', sections: [{ id: 'data-sync', label: 'Data & Sync', slugs: ['live-sync', 'data-quality-indicators', 'offline-mode'] }, { id: 'ai-engine', label: 'AI Engine', slugs: ['how-ai-works', 'confidence-bands', 'model-limitations'] }, { id: 'integrations', label: 'Integrations', slugs: ['kobo-integration', 'azure-architecture', 'google-sheets-sync'] }] }
]

const titleFromSlug = (slug: string) => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

const generateContent = (slug: string, collectionLabel: string, sectionLabel: string) => {
  const title = titleFromSlug(slug)
  return `# ${title}

## Overview
${title} provides comprehensive operational guidance for ${collectionLabel} within the SAMADHAAN platform.

## Key Features
- Role-based access controls
- Real-time data synchronization
- Compliance with national TB surveillance protocols
- Integrated workflow management

## Operational Guidance

### Step 1: Access the Module
Navigate from the sidebar to the ${sectionLabel} section and open the relevant workflow interface.

### Step 2: Apply Filters
Use your role-specific scope and district/state filters to view relevant data within your operational boundary.

### Step 3: Execute Actions
Perform required actions according to your role permissions and capture outcomes for monitoring and audit trails.

## Reference Matrix

| Area | What to Check | Frequency |
|------|---------------|-----------|
| Data Quality | Completeness and consistency | Daily |
| SLA Status | Pending and breached actions | Per shift |
| Reporting | Submission and compliance | Weekly |

## Best Practices
- Follow district/state SOPs for all operational procedures
- Escalate anomalies immediately through proper channels
- Maintain audit trail documentation for all critical actions
- Coordinate with supervisors for role-specific guidance

## Support
For technical assistance or operational queries, contact your district coordinator or refer to the Knowledge Vault for detailed documentation.`
}

async function seedArticles() {
  console.log('═══════════════════════════════════════════════════════════════════════════')
  console.log('📚 KNOWLEDGE ARTICLES DATABASE SEEDER')
  console.log('═══════════════════════════════════════════════════════════════════════════')
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`)
  console.log('')

  let totalArticles = 0
  let createdCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const collection of COLLECTIONS) {
    console.log(`\n📁 Collection: ${collection.label}`)
    
    for (const section of collection.sections) {
      console.log(`  📂 Section: ${section.label}`)
      
      for (const slug of section.slugs) {
        totalArticles++
        const title = titleFromSlug(slug)
        
        try {
          // Check if article already exists
          const { data: existing } = await supabase
            .from('knowledge_articles')
            .select('id')
            .eq('slug', slug)
            .single()

          if (existing) {
            console.log(`    ⏭️  ${title} (already exists)`)
            skippedCount++
            continue
          }

          // Generate content
          const content = generateContent(slug, collection.label, section.label)
          const excerpt = content.slice(0, 150).replace(/[#\n*`]/g, ' ').trim()

          // Insert article
          const { error } = await supabase
            .from('knowledge_articles')
            .insert({
              title,
              slug,
              content,
              excerpt,
              article_type: 'guide',
              visible_to: 'all',
              created_by_role: 'admin',
              created_by_name: 'System',
              is_published: true,
              is_pinned: false,
              display_order: totalArticles,
              collection_id: collection.id,
              section_id: section.id,
            })

          if (error) {
            console.log(`    ❌ ${title} - Error: ${error.message}`)
            errorCount++
          } else {
            console.log(`    ✅ ${title}`)
            createdCount++
          }
        } catch (err) {
          console.log(`    ❌ ${title} - Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
          errorCount++
        }
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════')
  console.log('📊 SEEDING SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════════════════')
  console.log(`Total Articles:  ${totalArticles}`)
  console.log(`✅ Created:      ${createdCount}`)
  console.log(`⏭️  Skipped:      ${skippedCount}`)
  console.log(`❌ Errors:       ${errorCount}`)
  console.log(`Success Rate:    ${((createdCount / totalArticles) * 100).toFixed(1)}%`)
  console.log('')

  if (errorCount === 0 && createdCount > 0) {
    console.log('🎉 All articles seeded successfully!')
  } else if (skippedCount === totalArticles) {
    console.log('ℹ️  All articles already exist in database')
  } else if (errorCount > 0) {
    console.log('⚠️  Some articles failed to seed. Check errors above.')
  }
}

seedArticles().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
