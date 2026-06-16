/**
 * Shared scope validation and audit logging helpers
 * Centralizes reconciliation validation logic used by both frontend and backend
 */

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface ScopeContext {
  screeningDate: string | null;
  facilityName: string | null;
  screeningDistrict: string | null;
  screeningState: string | null;
  scopeMode: string | null;
  sessionId: string | null;
  isEmptyScope?: boolean;
  scopedCandidateCount?: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface RowDecision {
  action: 'accept' | 'create' | 'reject';
  selectedPatientId?: string;
}

export interface AuditLogPayload {
  action: string;
  user?: string;
  sessionId?: string;
  screeningDate?: string | null;
  facilityName?: string | null;
  screeningDistrict?: string | null;
  screeningState?: string | null;
  scopeMode?: string | null;
  isEmptyScope?: boolean;
  scopedCandidateCount?: number;
  summary?: Record<string, any>;
  results?: Record<string, any>;
  rowCount?: number;
  extractionId?: string | null;
}

// ═══════════════════════════════════════════════════════════
// Date Validation
// ═══════════════════════════════════════════════════════════

/**
 * Validate ISO date format (YYYY-MM-DD)
 */
export function isValidISODate(value: string | null | undefined): boolean {
  if (!value) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(value);
}

// ═══════════════════════════════════════════════════════════
// Scope Validation
// ═══════════════════════════════════════════════════════════

/**
 * Validate scope context for reconciliation
 * Returns array of validation errors (empty if valid)
 */
export function validateScopeContext(scopeContext: Partial<ScopeContext>): ValidationError[] {
  const errors: ValidationError[] = [];

  // screeningDate is required
  if (!scopeContext.screeningDate) {
    errors.push({
      field: 'screeningDate',
      message: 'screeningDate is required for register reconciliation',
    });
  } else if (!isValidISODate(scopeContext.screeningDate)) {
    errors.push({
      field: 'screeningDate',
      message: `screeningDate must be YYYY-MM-DD format, got: ${scopeContext.screeningDate}`,
    });
  }

  // date_facility mode requires facilityName
  if (scopeContext.scopeMode === 'date_facility' && !scopeContext.facilityName) {
    errors.push({
      field: 'facilityName',
      message: 'facilityName is required when scopeMode is date_facility',
    });
  }

  return errors;
}

/**
 * Assert scope context is valid, throw error if not
 * Useful for API routes that need to return 400 responses
 */
export function assertScopeContextValid(scopeContext: Partial<ScopeContext>): void {
  const errors = validateScopeContext(scopeContext);
  if (errors.length > 0) {
    const error = errors[0];
    throw new Error(error.message);
  }
}

// ═══════════════════════════════════════════════════════════
// Empty-Scope Action Validation
// ═══════════════════════════════════════════════════════════

/**
 * Assert that no accept actions exist when in empty-scope mode
 * Returns error message if invalid, null if valid
 */
export function assertEmptyScopeActions(
  decisions: Map<number, RowDecision> | RowDecision[],
  isEmptyScope: boolean,
): string | null {
  if (!isEmptyScope) return null;

  const decisionArray = Array.isArray(decisions) ? decisions : Array.from(decisions.values());
  const invalidActions = decisionArray.filter(d => d.action === 'accept');

  if (invalidActions.length > 0) {
    return `Empty-scope reconciliation only allows create/reject actions. Found ${invalidActions.length} accept action(s) which require existing candidates.`;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// Structured Audit Logging
// ═══════════════════════════════════════════════════════════

/**
 * Standardized audit logging for reconciliation events
 * Outputs structured JSON to console
 */
export function logReconciliationAudit(event: string, payload: AuditLogPayload): void {
  console.log(JSON.stringify({
    level: 'info',
    action: event,
    ...payload,
  }));
}
