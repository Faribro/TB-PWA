# Premium Button System Migration Guide

## Overview
SAMADHAAN now features an award-winning button system with 3D pressed effects, blob animations, and glass morphism. This guide shows how to migrate existing buttons.

## Button Components

### 1. Standard Button (Upgraded)
**Location:** `components/ui/button.tsx`

**Variants:**
- `default` - Emerald (primary action)
- `success` - Green (confirmations)
- `destructive` - Rose (deletions)
- `warning` - Amber (alerts)
- `outline` - Border only
- `ghost` - Transparent
- `neutral` - Slate (secondary)
- `glass` - Glass morphism

**Usage:**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">Primary Action</Button>
<Button variant="success">Approve</Button>
<Button variant="destructive">Delete</Button>
<Button variant="warning">Alert</Button>
```

### 2. Premium Button (New)
**Location:** `components/ui/PremiumButton.tsx`

**Variants:**
- `primary` - Emerald with 3D press
- `secondary` - Cyan with 3D press
- `success` - Green with 3D press
- `danger` - Rose with 3D press
- `warning` - Amber with 3D press
- `institutional` - Gold with 10px press depth
- `blob` - Animated goo effect
- `glass` - Glass morphism

**Usage:**
```tsx
import PremiumButton from '@/components/ui/PremiumButton';

<PremiumButton variant="primary">Primary Action</PremiumButton>
<PremiumButton variant="institutional">Premium Feature</PremiumButton>
<PremiumButton variant="blob">Hover Me</PremiumButton>
<PremiumButton variant="primary" isLoading>Processing...</PremiumButton>
<PremiumButton variant="primary" leftIcon={<Icon />}>With Icon</PremiumButton>
```

## Migration Patterns

### Pattern 1: Replace Blue/Violet Gradients

**Before:**
```tsx
className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
```

**After (Standard Button):**
```tsx
<Button variant="default">Action</Button>
```

**After (Premium Button):**
```tsx
<PremiumButton variant="primary">Action</PremiumButton>
```

**After (Custom with 3D):**
```tsx
className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#047857,0_12px_24px_rgba(16,185,129,0.4)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#047857,0_16px_32px_rgba(16,185,129,0.6)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-3px_0_#047857] active:translate-y-2"
```

### Pattern 2: Replace bg-blue-600

**Before:**
```tsx
className="bg-blue-600 hover:bg-blue-700 text-white"
```

**After:**
```tsx
<Button variant="default">Action</Button>
```

### Pattern 3: Replace Destructive Actions

**Before:**
```tsx
className="bg-red-600 hover:bg-red-700 text-white"
```

**After:**
```tsx
<Button variant="destructive">Delete</Button>
```

### Pattern 4: Replace Success Actions

**Before:**
```tsx
className="bg-green-600 hover:bg-green-700 text-white"
```

**After:**
```tsx
<Button variant="success">Approve</Button>
```

### Pattern 5: Replace Warning Actions

**Before:**
```tsx
className="bg-yellow-600 hover:bg-yellow-700 text-white"
```

**After:**
```tsx
<Button variant="warning">Alert</Button>
```

### Pattern 6: Institutional/Premium Actions

**Before:**
```tsx
className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white"
```

**After:**
```tsx
<PremiumButton variant="institutional">Premium Action</PremiumButton>
```

## Color Mapping

| Old Color | New Variant | Component |
|-----------|-------------|-----------|
| `blue-500/600/700` | `default` | Button |
| `indigo-500/600` | `default` | Button |
| `violet-500/600` | `default` | Button |
| `green-500/600` | `success` | Button |
| `red-500/600` | `destructive` | Button |
| `rose-500/600` | `destructive` | Button |
| `amber-500/600` | `warning` | Button |
| `yellow-500/600` | `warning` | Button |
| `slate-700/800/900` | `neutral` | Button |

## 3D Pressed Effect Classes

### Emerald (Primary)
```tsx
className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#047857,0_12px_24px_rgba(16,185,129,0.4)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#047857,0_16px_32px_rgba(16,185,129,0.6)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-3px_0_#047857] active:translate-y-2"
```

### Cyan (Secondary)
```tsx
className="bg-gradient-to-br from-cyan-500 via-cyan-600 to-cyan-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#0e7490,0_12px_24px_rgba(6,182,212,0.4)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#0e7490,0_16px_32px_rgba(6,182,212,0.6)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-3px_0_#0e7490] active:translate-y-2"
```

### Rose (Destructive)
```tsx
className="bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#be123c,0_12px_24px_rgba(244,63,94,0.4)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#be123c,0_16px_32px_rgba(244,63,94,0.6)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-3px_0_#be123c] active:translate-y-2"
```

### Amber (Warning)
```tsx
className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#b45309,0_12px_24px_rgba(245,158,11,0.4)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#b45309,0_16px_32px_rgba(245,158,11,0.6)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-3px_0_#b45309] active:translate-y-2"
```

### Gold (Institutional)
```tsx
className="bg-gradient-to-br from-yellow-500 via-amber-600 to-orange-600 shadow-[inset_0_2px_0_rgba(255,229,196,0.8),0_10px_0_#915100,0_15px_30px_rgba(255,161,43,0.5)] hover:shadow-[inset_0_2px_0_rgba(255,229,196,0.8),0_10px_0_#915100,0_20px_40px_rgba(255,161,43,0.7)] active:shadow-[inset_0_2px_0_rgba(255,229,196,0.8),inset_0_-4px_0_#915100] active:translate-y-[10px]"
```

## Files to Update

### High Priority (User-Facing)
1. ✅ `app/admin/users/page.tsx` - Admin user management (COMPLETED)
2. ✅ `app/dashboard/submit-new/page.tsx` - Form submissions (COMPLETED)
3. `app/dashboard/vertex/bulk-upload/page.tsx` - Bulk operations
4. ✅ `components/PatientDetailDrawer.tsx` - Patient actions (COMPLETED)
5. ✅ `components/FollowUpPipeline.tsx` - Pipeline actions (COMPLETED)
6. `components/MandEHub.tsx` - M&E actions
7. `components/CommandCenter.tsx` - Command center actions

### Medium Priority (Modals/Dialogs)
8. `components/QuickEditModal.tsx`
9. `components/QuickEditSheet.tsx`
10. `components/RegisterReconciliation.tsx`
11. `components/RegisterUploadModal.tsx`
12. `app/docs/page.tsx` - Knowledge vault actions

### Low Priority (Internal/Admin)
13. `app/admin/etl/page.tsx`
14. `components/DataTable.tsx`
15. `components/OptimizedDataTable.tsx`

## Testing Checklist

- [ ] All buttons render correctly
- [ ] 3D press effect works on click
- [ ] Hover states are smooth
- [ ] Disabled states are visible
- [ ] Loading states work
- [ ] Icons align properly
- [ ] Mobile responsive
- [ ] Keyboard navigation works
- [ ] Screen reader accessible

## Demo Page

View all button variants at: `/button-showcase`

## Notes

- The standard `Button` component is backward compatible
- Use `PremiumButton` for special actions that need extra emphasis
- The `institutional` variant is reserved for premium/paid features
- The `blob` variant is best for CTAs and hero sections
- Always test on mobile devices for touch feedback
