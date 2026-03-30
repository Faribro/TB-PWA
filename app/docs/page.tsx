'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronLeft, Plus, Edit2, Trash2, Check, X,
  Pin, Search, BookOpen, Home, Network, CheckCircle, Database,
  Shield, Users, BarChart3
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useSessionScope } from '@/hooks/useSessionScope'
import { cn } from '@/lib/utils'

type ArticleType = 'manual' | 'guide' | 'announcement'
type VisibleTo = 'all' | 'PC' | 'SPM' | 'ME' | 'PM'

interface Article {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  article_type: ArticleType
  visible_to: VisibleTo
  created_by_role: string
  created_by_name: string
  is_published: boolean
  is_pinned: boolean
  display_order: number
  created_at: string
  updated_at: string
}

function canSeeArticle(article: Article, role: string): boolean {
  if (article.visible_to === 'all' || article.visible_to === 'PC') return true
  if (article.visible_to === 'SPM') return ['SPM', 'ME', 'PM', 'admin'].includes(role)
  if (article.visible_to === 'ME') return ['ME', 'PM', 'admin'].includes(role)
  if (article.visible_to === 'PM') return ['PM', 'admin'].includes(role)
  return false
}

function canCreate(role: string) {
  // Only PM, admin, and SPM can create articles
  // ME and PC are read-only
  return ['PM', 'admin', 'SPM'].includes(role)
}

function canEdit(article: Article, role: string, staffName: string | null) {
  // PM and admin can edit everything
  if (['PM', 'admin'].includes(role)) return true
  // SPM can only edit their own guides
  return role === 'SPM' && article.created_by_name === staffName && article.article_type === 'guide'
  // ME and PC cannot edit (returns false)
}

const TYPE_CONFIG: Record<ArticleType, { label: string; badge: string }> = {
  manual:       { label: 'Manual',       badge: 'bg-[#c6d8e4]/60 text-[#006494]' },
  guide:        { label: 'Guide',        badge: 'bg-[#cedcd8]/60 text-[#01696f]' },
  announcement: { label: 'Announcement', badge: 'bg-[#ddcfc6]/60 text-[#964219]' },
}

const SLUG_ICON: Record<string, LucideIcon> = {
  'system-overview':       Home,
  'architecture-workflow': Network,
  'me-protocol':           CheckCircle,
  'vertex-operations':     Database,
  'pc-screening-guide':    Users,
  'security-protocols':    Shield,
  'data-integrity':        BarChart3,
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return (
          <h2 key={i} className="text-base font-semibold text-[#28251d] mt-8 mb-3 first:mt-0 pb-2 border-b border-black/[0.06]">
            {line.slice(3)}
          </h2>
        )
        if (line.startsWith('### ')) return (
          <h3 key={i} className="text-sm font-semibold text-[#28251d] mt-5 mb-2">
            {line.slice(4)}
          </h3>
        )
        if (line.startsWith('- ') || /^\d+\.\s/.test(line)) {
          const text = line.replace(/^- /, '').replace(/^\d+\.\s/, '')
          return (
            <li key={i}
              className="text-sm text-[#28251d] leading-relaxed ml-5 list-disc marker:text-[#bab9b4] mb-1.5"
              dangerouslySetInnerHTML={{
                __html: text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-[#f3f0ec] rounded text-xs font-mono">$1</code>')
              }}
            />
          )
        }
        if (line.trim() === '') return <div key={i} className="h-2" />
        return (
          <p key={i} className="text-sm text-[#28251d] leading-relaxed mb-2"
            dangerouslySetInnerHTML={{
              __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-[#f3f0ec] rounded text-xs font-mono">$1</code>')
            }}
          />
        )
      })}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="animate-pulse p-10 space-y-4">
      <div className="h-5 w-2/5 bg-[#e6e4df] rounded" />
      <div className="h-3 w-32 bg-[#e6e4df] rounded" />
      <div className="mt-6 space-y-3">
        {[100, 90, 85, 70, 95, 60].map((w, i) => (
          <div key={i} className="h-3 bg-[#e6e4df] rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}

function ArticleEditor({
  article, role, onChange, onSave, onClose, saving
}: {
  article: Partial<Article>
  role: string
  onChange: (a: Partial<Article>) => void
  onSave: () => void
  onClose: () => void
  saving: boolean
}) {
  const allowedTypes: ArticleType[] = role === 'SPM' ? ['guide'] : ['manual', 'guide', 'announcement']
  const visibilityOpts = role === 'SPM'
    ? [
        { v: 'PC'  as VisibleTo, l: 'All roles (including PC)' },
        { v: 'SPM' as VisibleTo, l: 'SPM, ME & above' },
      ]
    : [
        { v: 'all' as VisibleTo, l: 'All roles' },
        { v: 'PC'  as VisibleTo, l: 'All including PC' },
        { v: 'SPM' as VisibleTo, l: 'SPM, ME & above' },
        { v: 'ME'  as VisibleTo, l: 'ME, PM & admin only' },
        { v: 'PM'  as VisibleTo, l: 'PM & admin only' },
      ]

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06]">
          <h3 className="font-semibold text-[#28251d] text-sm">
            {article.id ? 'Edit Article' : 'New Article'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-md text-[#7a7974] hover:bg-[#f3f0ec] transition-colors" aria-label="Close editor">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#28251d] mb-1.5">
              Title <span className="text-[#a12c7b]">*</span>
            </label>
            <input type="text" value={article.title ?? ''} placeholder="Article title…"
              onChange={e => onChange({ ...article, title: e.target.value })}
              className="w-full px-3 py-2.5 border border-black/[0.1] rounded-lg text-sm focus:outline-none focus:border-[#01696f] focus:ring-2 focus:ring-[#cedcd8] transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#28251d] mb-1.5">Type</label>
              <select value={article.article_type ?? 'guide'}
                onChange={e => onChange({ ...article, article_type: e.target.value as ArticleType })}
                className="w-full px-3 py-2.5 bg-white border border-black/[0.1] rounded-lg text-sm focus:outline-none focus:border-[#01696f] focus:ring-2 focus:ring-[#cedcd8] transition-all">
                {allowedTypes.map(t => (
                  <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#28251d] mb-1.5">Visible to</label>
              <select value={article.visible_to ?? 'all'}
                onChange={e => onChange({ ...article, visible_to: e.target.value as VisibleTo })}
                className="w-full px-3 py-2.5 bg-white border border-black/[0.1] rounded-lg text-sm focus:outline-none focus:border-[#01696f] focus:ring-2 focus:ring-[#cedcd8] transition-all">
                {visibilityOpts.map(o => (
                  <option key={o.v} value={o.v}>{o.l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#28251d] mb-1.5">
              Content <span className="text-[#a12c7b]">*</span>
              <span className="ml-1 font-normal text-[#7a7974]">— Markdown: ## headings, **bold**, - lists</span>
            </label>
            <textarea value={article.content ?? ''} rows={12}
              placeholder={"## Section heading\n\nBody text here. **Bold** is supported.\n\n- List item\n- List item"}
              onChange={e => onChange({ ...article, content: e.target.value })}
              className="w-full px-3 py-2.5 border border-black/[0.1] rounded-lg text-sm font-mono resize-none focus:outline-none focus:border-[#01696f] focus:ring-2 focus:ring-[#cedcd8] transition-all"
            />
          </div>

          <div className="flex gap-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={article.is_published ?? true}
                onChange={e => onChange({ ...article, is_published: e.target.checked })}
                className="w-4 h-4 rounded border-black/20 accent-[#01696f]" />
              <span className="text-sm text-[#28251d]">Published</span>
            </label>
            {['PM', 'admin'].includes(role) && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={article.is_pinned ?? false}
                  onChange={e => onChange({ ...article, is_pinned: e.target.checked })}
                  className="w-4 h-4 rounded border-black/20 accent-[#01696f]" />
                <span className="text-sm text-[#28251d]">Pin to top</span>
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-black/[0.06]">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-black/[0.1] rounded-lg text-sm text-[#7a7974] hover:bg-[#f3f0ec] transition-colors">
            Cancel
          </button>
          <button onClick={onSave}
            disabled={saving || !article.title?.trim() || !article.content?.trim()}
            className="flex-1 py-2.5 bg-[#01696f] text-white rounded-lg text-sm font-medium hover:bg-[#0c4e54] active:bg-[#0f3638] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {saving
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Check size={14} />{article.id ? 'Save changes' : 'Publish'}</>
            }
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function DocsPage() {
  const sessionScope = useSessionScope()
  const role = sessionScope?.role ?? null
  const staffName = sessionScope?.staffName ?? null
  const supabase = createClient()

  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editDraft, setEditDraft] = useState<Partial<Article> | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('knowledge_articles')
        .select('*')
        .eq('is_published', true)
        .order('is_pinned', { ascending: false })
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (fetchError) {
        console.error('[docs] fetch error:', fetchError)
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const visible = (data ?? []).filter(a => canSeeArticle(a, role ?? 'PC'))
      setArticles(visible)

      if (visible.length > 0) {
        setActiveSlug(prev => prev ?? visible[0].slug)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[docs] unexpected error:', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [role, supabase])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  const activeArticle = articles.find(a => a.slug === activeSlug) ?? null

  const filteredSidebar = search
    ? articles.filter(a =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        (a.excerpt ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : articles

  const saveArticle = async () => {
    if (!editDraft?.title?.trim() || !editDraft?.content?.trim()) return
    setSaving(true)
    try {
      const slug = editDraft.slug || editDraft.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const payload = {
        title: editDraft.title.trim(),
        slug,
        content: editDraft.content.trim(),
        excerpt: editDraft.content.trim().slice(0, 150).replace(/[#\n*`]/g, ' ').trim(),
        article_type: editDraft.article_type ?? 'guide',
        visible_to: editDraft.visible_to ?? 'all',
        created_by_role: role ?? 'PM',
        created_by_name: staffName ?? '',
        is_published: editDraft.is_published ?? true,
        is_pinned: editDraft.is_pinned ?? false,
        display_order: editDraft.display_order ?? 999,
      }

      if (editDraft.id) {
        const { error } = await supabase.from('knowledge_articles').update(payload).eq('id', editDraft.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('knowledge_articles').insert(payload)
        if (error) throw error
      }

      setShowEditor(false)
      setEditDraft(null)
      await fetchArticles()
      if (!editDraft.id) setActiveSlug(slug)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      console.error('[docs] save error:', msg)
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  const deleteArticle = async (id: string) => {
    const { error } = await supabase.from('knowledge_articles').delete().eq('id', id)
    if (error) { console.error('[docs] delete error:', error); return }
    setDeleteId(null)
    if (activeArticle?.id === id) {
      setActiveSlug(articles.find(a => a.id !== id)?.slug ?? null)
    }
    await fetchArticles()
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">

      <aside className="w-[240px] flex-shrink-0 flex flex-col h-full border-r border-black/[0.06] bg-[#f9f8f5]">

        <div className="px-5 pt-6 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#7a7974]">
              Navigation
            </span>
            {canCreate(role ?? '') && role && (
              <button
                onClick={() => {
                  setEditDraft({ article_type: 'guide', visible_to: 'all', is_published: true, is_pinned: false })
                  setShowEditor(true)
                }}
                aria-label="New article"
                className="p-1 rounded-md text-[#7a7974] hover:bg-[#e6e4df] hover:text-[#01696f] transition-colors"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#bab9b4] pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-black/[0.08] rounded-md text-xs text-[#28251d] placeholder:text-[#bab9b4] focus:outline-none focus:border-[#01696f] transition-all"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {loading ? (
            <div className="space-y-1 px-2 mt-1 animate-pulse">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-8 bg-[#e6e4df] rounded-md" />
              ))}
            </div>
          ) : error ? (
            <div className="px-3 py-4">
              <p className="text-xs text-[#a12c7b] font-medium mb-1">Failed to load</p>
              <p className="text-xs text-[#7a7974] mb-3">{error}</p>
              <button onClick={fetchArticles} className="text-xs text-[#01696f] underline">Retry</button>
            </div>
          ) : filteredSidebar.length === 0 ? (
            <p className="px-3 py-4 text-xs text-[#bab9b4]">
              {search ? 'No matches.' : 'No articles yet.'}
            </p>
          ) : (
            filteredSidebar.map(article => {
              const IconComponent = SLUG_ICON[article.slug] ?? BookOpen
              const isActive = article.slug === activeSlug
              return (
                <button key={article.slug}
                  onClick={() => setActiveSlug(article.slug)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors duration-150',
                    isActive ? 'bg-[#cedcd8]/70 text-[#01696f] font-medium' : 'text-[#7a7974] hover:bg-[#f3f0ec] hover:text-[#28251d]'
                  )}
                >
                  <IconComponent size={14} className="flex-shrink-0" />
                  <span className="truncate">{article.title}</span>
                  {article.is_pinned && <Pin size={9} className="ml-auto flex-shrink-0 text-[#01696f]/50" />}
                </button>
              )
            })
          )}
        </nav>

        <div className="flex-shrink-0 px-3 pb-5 pt-2 border-t border-black/[0.06]">
          <Link href="/dashboard/command-hub"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#7a7974] hover:bg-[#f3f0ec] hover:text-[#28251d] transition-colors group"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Command Hub
          </Link>
        </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto">

        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-black/[0.06]">
          <div className="px-10 py-5 flex items-start justify-between">
            <div>
              <h1 className="text-xs font-bold tracking-[0.2em] uppercase text-[#28251d]">Knowledge Vault</h1>
              <p className="text-xs text-[#7a7974] mt-0.5">National Health Intelligence Documentation & SOPs</p>
            </div>

            {activeArticle && canEdit(activeArticle, role ?? '', staffName) && (
              <div className="flex items-center gap-1.5">
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_CONFIG[activeArticle.article_type].badge)}>
                  {TYPE_CONFIG[activeArticle.article_type].label}
                </span>
                <button
                  onClick={() => { setEditDraft({ ...activeArticle }); setShowEditor(true) }}
                  aria-label="Edit article"
                  className="p-1.5 rounded-md text-[#7a7974] hover:bg-[#f3f0ec] hover:text-[#28251d] transition-colors"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => setDeleteId(activeArticle.id)}
                  aria-label="Delete article"
                  className="p-1.5 rounded-md text-[#7a7974] hover:bg-[#e0ced7]/40 hover:text-[#a12c7b] transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-10 py-8 max-w-3xl">
          {loading ? (
            <PageSkeleton />
          ) : error ? (
            <div className="py-20 text-center">
              <p className="text-sm font-medium text-[#a12c7b] mb-2">Failed to load articles</p>
              <p className="text-xs text-[#7a7974] mb-4">{error}</p>
              <button onClick={fetchArticles} className="text-sm text-[#01696f] underline">Try again</button>
            </div>
          ) : !activeArticle ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <BookOpen size={36} className="text-[#bab9b4] mb-4" />
              <p className="text-sm font-medium text-[#28251d] mb-1.5">No articles available</p>
              <p className="text-xs text-[#7a7974] max-w-[28ch]">
                {canCreate(role ?? '') ? 'Use the + button in the sidebar to create the first article.' : 'Articles will appear here once published by your program manager.'}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.article
                key={activeArticle.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <h2 className="text-lg font-bold text-[#28251d] mb-1.5">{activeArticle.title}</h2>
                <div className="flex items-center gap-3 mb-8">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_CONFIG[activeArticle.article_type].badge)}>
                    {TYPE_CONFIG[activeArticle.article_type].label}
                  </span>
                  <span className="text-xs text-[#7a7974]">
                    Last updated {new Date(activeArticle.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-xs text-[#bab9b4]">{activeArticle.created_by_role}</span>
                </div>
                <MarkdownContent content={activeArticle.content} />
              </motion.article>
            </AnimatePresence>
          )}
        </div>
      </main>

      <AnimatePresence>
        {showEditor && editDraft && (
          <ArticleEditor
            article={editDraft}
            role={role ?? 'PM'}
            onChange={setEditDraft}
            onSave={saveArticle}
            onClose={() => { setShowEditor(false); setEditDraft(null) }}
            saving={saving}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] flex items-center justify-center px-4"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full"
            >
              <h3 className="font-semibold text-[#28251d] text-sm mb-2">Delete article?</h3>
              <p className="text-xs text-[#7a7974] mb-5">This permanently removes the article and cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 border border-black/[0.1] rounded-lg text-sm text-[#7a7974] hover:bg-[#f3f0ec] transition-colors">
                  Cancel
                </button>
                <button onClick={() => deleteArticle(deleteId)}
                  className="flex-1 py-2.5 bg-[#a12c7b] text-white rounded-lg text-sm font-medium hover:bg-[#7d1e5e] transition-colors">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
