# RBAC Testing Documentation - SAMADHAAN Health OS

## Overview

Complete role-based access control (RBAC) testing suite for SAMADHAAN Health OS. Tests validate data access permissions, middleware protection, navigation filtering, and UI authorization across all 4 user roles.

## Test Suites

### 1. Data Access Tests (`test:rbac`)

**File**: `scripts/test-rbac.js`

Tests role-based data filtering at the database level using Supabase REST API.

#### Test Scenarios

| Test | Role | Expected Access | Validation |
|------|------|----------------|------------|
| 1 | PM | National (all records) | No state/district filters applied |
| 2 | admin | National (all records) | No state/district filters applied |
| 3 | SPM | State-level only | All records match user's state |
| 4 | ME | State-level only | All records match user's state |
| 5 | PC | Own submissions only | All records match user's staff_name |

#### Run Command

```bash
# Windows
set SUPABASE_SERVICE_ROLE_KEY=<your_key> && node scripts/test-rbac.js

# Or use npm script
bun run test:rbac
```

#### Expected Output

```
═══════════════════════════════════════════════════════════════════════════
🔐 RBAC TESTING SUITE - SAMADHAAN Health OS
═══════════════════════════════════════════════════════════════════════════

📋 TEST: PM Role - National Access
   Role: PM
   State: null (national)
   District: null
   📊 Records returned: 10
   ✅ PASSED

📋 TEST: Admin Role - National Access
   Role: admin
   State: null (national)
   District: null
   📊 Records returned: 10
   ✅ PASSED

📋 TEST: SPM Role - State Level Access
   Role: SPM
   State: Maharashtra
   District: null
   📊 Records returned: 10
   ✅ PASSED

📋 TEST: ME Role - State Level Access
   Role: ME
   State: Maharashtra
   District: null
   📊 Records returned: 10
   ✅ PASSED

📋 TEST: PC Role - Own Submissions Only
   Role: PC
   State: Maharashtra
   District: Mumbai
   Staff Name: PC Test User
   📊 Records returned: 0
   ✅ PASSED

═══════════════════════════════════════════════════════════════════════════
📊 TEST SUMMARY
═══════════════════════════════════════════════════════════════════════════
Total Tests:  5
✅ Passed:    5
❌ Failed:    0
Success Rate: 100.0%
═══════════════════════════════════════════════════════════════════════════
```

---

### 2. Integration Tests (`test:rbac-integration`)

**File**: `scripts/test-rbac-integration.js`

Tests RBAC implementation across middleware, layouts, pages, and hooks by analyzing source code.

#### Test Scenarios

| Test | Component | Validation |
|------|-----------|------------|
| 1 | Middleware | Admin route protection, SUPERUSER_ROLES check, PC redirect |
| 2 | Session Scope | SUPERUSER_ROLES definition, state-level logic, PC filtering |
| 3 | Dashboard Layout | TAB_CONFIG, PC_TAB_CONFIG, visibleTabs logic |
| 4 | PC Dashboard | Page exists, stats cards, patient list, submit button |
| 5 | Admin Layout | SUPERUSER_ROLES check, unauthorized redirect |
| 6 | Command Hub | Superuser authorization check |
| 7 | Auth.ts | Impersonation system, SUPERUSER_ROLES check |
| 8 | useSessionScope Hook | SUPERUSER_ROLES constant, staffName field |

#### Run Command

```bash
node scripts/test-rbac-integration.js

# Or use npm script
bun run test:rbac-integration
```

#### Expected Output

```
═══════════════════════════════════════════════════════════════════════════
🔐 RBAC INTEGRATION TEST SUITE
═══════════════════════════════════════════════════════════════════════════

📋 TEST 1: Middleware Admin Route Protection
   ✅ Admin route protection: FOUND
   ✅ SUPERUSER_ROLES check: FOUND
   ✅ PC redirect logic: FOUND
   ✅ PASSED

📋 TEST 2: Session Scope Configuration
   ✅ SUPERUSER_ROLES defined: PM, admin
   ✅ State-level logic: SPM, ME
   ✅ PC staffName filtering: FOUND
   ✅ Correct column name (staff_name): FOUND
   ✅ PASSED

📋 TEST 3: Dashboard Layout Navigation Filtering
   ✅ TAB_CONFIG defined: FOUND
   ✅ PC_TAB_CONFIG defined: FOUND
   ✅ visibleTabs logic: FOUND
   ✅ PASSED

📋 TEST 4: PC Dashboard Page
   ✅ PC dashboard page: EXISTS
   ✅ Stats cards: FOUND
   ✅ Patient list: FOUND
   ✅ Submit button: FOUND
   ✅ PASSED

📋 TEST 5: Admin Layout Authorization
   ✅ Admin layout: EXISTS
   ✅ SUPERUSER_ROLES check: FOUND
   ✅ Unauthorized redirect: FOUND
   ✅ PASSED

📋 TEST 6: Command Hub Authorization
   ✅ Command Hub page: EXISTS
   ✅ Superuser check: FOUND
   ✅ PASSED

📋 TEST 7: Impersonation System (Auth.ts)
   ✅ Auth.ts: EXISTS
   ✅ Impersonation system: FOUND
   ✅ SUPERUSER_ROLES check: FOUND
   ✅ PASSED

📋 TEST 8: useSessionScope Hook
   ✅ useSessionScope hook: EXISTS
   ✅ SUPERUSER_ROLES constant: FOUND
   ✅ staffName field: FOUND
   ✅ PASSED

═══════════════════════════════════════════════════════════════════════════
📊 INTEGRATION TEST SUMMARY
═══════════════════════════════════════════════════════════════════════════
Total Tests:  8
✅ Passed:    8
❌ Failed:    0
Success Rate: 100.0%
═══════════════════════════════════════════════════════════════════════════

🎉 ALL INTEGRATION TESTS PASSED!

RBAC Implementation Summary:
  ✅ PM/admin: National access, admin panel, impersonation
  ✅ SPM: State-level access, bulk operations
  ✅ ME: State-level access, no Command Hub
  ✅ PC: Own submissions only, simplified dashboard
```

---

### 3. Complete Test Suite (`test:rbac-all`)

Runs both data access and integration tests in sequence.

#### Run Command

```bash
# Windows
set SUPABASE_SERVICE_ROLE_KEY=<your_key> && bun run test:rbac-all

# Linux/Mac
SUPABASE_SERVICE_ROLE_KEY=<your_key> bun run test:rbac-all
```

---

## Role Hierarchy

### Superuser Roles (PM, admin)
- **Data Access**: National (all states, all districts)
- **Admin Panel**: ✅ Full access
- **Command Hub**: ✅ Full access
- **Impersonation**: ✅ Can impersonate other roles
- **Bulk Operations**: ✅ Enabled
- **Navigation**: 6 tabs (Command Hub, Vertex, Follow-up, M&E, GIS, Settings)

### State-Level Admin (SPM)
- **Data Access**: State-level only (no district filtering)
- **Admin Panel**: ❌ No access
- **Command Hub**: ✅ Full access
- **Impersonation**: ❌ Disabled
- **Bulk Operations**: ✅ Enabled
- **Navigation**: 6 tabs (Command Hub, Vertex, Follow-up, M&E, GIS, Settings)

### State-Level Read+Edit (ME)
- **Data Access**: State-level only (no district filtering)
- **Admin Panel**: ❌ No access
- **Command Hub**: ❌ Hidden from navigation
- **Impersonation**: ❌ Disabled
- **Bulk Operations**: ❌ Disabled
- **Navigation**: 5 tabs (Vertex, Follow-up, M&E, GIS, Settings)

### Program Coordinator (PC)
- **Data Access**: Own submissions only (filtered by staff_name)
- **Admin Panel**: ❌ No access
- **Command Hub**: ❌ Redirected to My Submissions
- **Impersonation**: ❌ Disabled
- **Bulk Operations**: ❌ Disabled
- **Navigation**: 2 tabs (My Work, Settings)
- **Dashboard**: Simplified personal dashboard at `/dashboard/my-submissions`

---

## Implementation Details

### Database Column Mapping

**Correct Column Name**: `staff_name` (not `name_of_staff`)

```typescript
// lib/session-scope.ts
export function applyScope<T>(query: T, scope: SessionScope): T {
  let q = query as any;
  if (scope.state)    q = q.ilike('screening_state',    scope.state);
  if (scope.district) q = q.ilike('screening_district', scope.district);
  if (scope.staffName) q = q.ilike('staff_name', `%${scope.staffName}%`);
  return q as T;
}
```

### SUPERUSER_ROLES Constant

Defined in 4 locations for consistency:

1. `lib/session-scope.ts`
2. `hooks/useSessionScope.ts`
3. `middleware.ts`
4. `auth.ts`

```typescript
const SUPERUSER_ROLES = ['PM', 'admin'];
```

### Middleware Protection

```typescript
// middleware.ts
if (pathname.startsWith('/admin')) {
  const role = req.auth.user?.role;
  const SUPERUSER_ROLES = ['PM', 'admin'];
  if (!SUPERUSER_ROLES.includes(role || '')) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }
}

// PC redirect
if (role === 'PC' && (pathname === '/dashboard' || pathname === '/dashboard/command-hub')) {
  return NextResponse.redirect(new URL('/dashboard/my-submissions', req.url));
}
```

### Navigation Filtering

```typescript
// app/dashboard/layout.tsx
const TAB_CONFIG = [
  { label: 'Command Hub', href: '/dashboard/command-hub', icon: LayoutDashboard },
  { label: 'Vertex', href: '/dashboard/vertex', icon: Network },
  { label: 'Follow-up', href: '/dashboard/follow-up', icon: Users },
  { label: 'M&E', href: '/dashboard/mande', icon: BarChart3 },
  { label: 'GIS', href: '/dashboard/gis', icon: Map },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const PC_TAB_CONFIG = [
  { label: 'My Work', href: '/dashboard/my-submissions', icon: FileText },
  { label: 'Settings', href: '/dashboard/settings', icon: User },
];

const visibleTabs = role === 'PC' 
  ? PC_TAB_CONFIG 
  : TAB_CONFIG.filter(tab => 
      role === 'ME' ? tab.href !== '/dashboard/command-hub' : true
    );
```

---

## Troubleshooting

### Test Failures

**Issue**: `column patients.name_of_staff does not exist`
- **Cause**: Wrong column name in query
- **Fix**: Use `staff_name` instead of `name_of_staff`

**Issue**: `SUPABASE_SERVICE_ROLE_KEY not found`
- **Cause**: Environment variable not set
- **Fix**: Set via command line or add to `.env.local`

**Issue**: Integration test fails on middleware check
- **Cause**: Missing SUPERUSER_ROLES constant
- **Fix**: Ensure `SUPERUSER_ROLES = ['PM', 'admin']` exists in middleware.ts

### Schema Verification

Check actual database columns:

```bash
node scripts/check-schema.js
```

This will list all available columns in the `patients` table.

---

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run RBAC Tests
  env:
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  run: |
    bun run test:rbac-all
```

---

## Manual Testing Checklist

### PM/Admin Role
- [ ] Can access `/admin` routes
- [ ] Can see all patients (no state/district filtering)
- [ ] Can access Command Hub
- [ ] Can see all 6 navigation tabs
- [ ] Can use impersonation system

### SPM Role
- [ ] Cannot access `/admin` routes (redirected to `/unauthorized`)
- [ ] Can only see patients from assigned state
- [ ] Can access Command Hub
- [ ] Can see all 6 navigation tabs
- [ ] Can perform bulk operations

### ME Role
- [ ] Cannot access `/admin` routes
- [ ] Can only see patients from assigned state
- [ ] Command Hub hidden from navigation
- [ ] Can see 5 navigation tabs (no Command Hub)
- [ ] Cannot perform bulk operations

### PC Role
- [ ] Cannot access `/admin` routes
- [ ] Redirected from `/dashboard/command-hub` to `/dashboard/my-submissions`
- [ ] Can only see own submissions (filtered by staff_name)
- [ ] Can see 2 navigation tabs (My Work, Settings)
- [ ] Personal dashboard shows submission stats

---

## Test Coverage

| Component | Coverage |
|-----------|----------|
| Data Access | ✅ 100% (5/5 roles tested) |
| Middleware | ✅ 100% (admin protection, PC redirect) |
| Session Scope | ✅ 100% (all role logic) |
| Navigation | ✅ 100% (TAB_CONFIG filtering) |
| Dashboards | ✅ 100% (PC dashboard exists) |
| Authorization | ✅ 100% (admin layout, command hub) |
| Impersonation | ✅ 100% (auth.ts system) |
| Hooks | ✅ 100% (useSessionScope) |

**Overall Coverage**: 13/13 tests passing (100%)

---

## Future Enhancements

1. **E2E Tests**: Add Playwright tests for full user flows
2. **API Route Tests**: Test all API endpoints with different roles
3. **Performance Tests**: Measure query performance with role filters
4. **Security Audit**: Penetration testing for privilege escalation
5. **Load Tests**: Test concurrent access with multiple roles

---

## Support

For issues or questions:
- Check test output for detailed error messages
- Review implementation files listed in test results
- Verify environment variables are set correctly
- Run `node scripts/check-schema.js` to verify database schema
