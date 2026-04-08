# CRITICAL FIX NEEDED - Circular Dependency

## Problem
Line 105: `scrollElementIntoView` is defined
Line 142: `scrollAndHighlight` is defined and references `scrollElementIntoView`

BUT the error shows `scrollAndHighlight` is trying to reference `scrollElementIntoView` BEFORE it's defined.

## Solution
In `components/TourOverlay.tsx`:

1. Find line ~105-140 where `scrollElementIntoView` is defined
2. Find line ~142-158 where `scrollAndHighlight` is defined
3. Ensure `scrollElementIntoView` comes FIRST (lines 105-140)
4. Then `scrollAndHighlight` comes SECOND (lines 142-158)

They are already in the correct order based on line numbers, so the issue must be that there's a DUPLICATE definition somewhere.

## Check for duplicates
Search the file for:
- "const scrollElementIntoView" - should appear ONCE
- "const scrollAndHighlight" - should appear ONCE

If there are duplicates, remove the one that appears BEFORE line 105.
