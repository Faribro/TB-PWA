// ═══════════════════════════════════════════════════════════════════════════
// SERVER INSTRUMENTATION - QSTASH SERVERLESS QUEUE
// ═══════════════════════════════════════════════════════════════════════════
// QStash is HTTP-based and doesn't require server initialization
// No background workers needed - all handled by Upstash
// ═══════════════════════════════════════════════════════════════════════════

export async function register() {
  // QStash doesn't need initialization - it's HTTP-based
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] ✅ QStash serverless queue ready (no init required)');
  }
}
