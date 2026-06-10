export const REDIS_KEYS = {
  QUARANTINE_HASH: 'quarantine:records',
  UPLOAD_LOCK_PREFIX: 'upload:lock:',
  AGENT_LAST_CALL: 'agent:last_call',
  SHEETS_CACHE: 'sheets:cache:data',
  SHEETS_CACHE_EXPIRE: 300, // 5 minutes in seconds
};
