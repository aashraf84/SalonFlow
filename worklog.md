---
Task ID: 1
Agent: Main Agent
Task: Scan entire ERP and fix all hardcoded/mock data to use real-time database data

Work Log:
- Scanned all 30 salon components for hardcoded/mock data
- Scanned all 29 API routes for database usage
- Identified 8 critical issues and 5 moderate issues
- Fixed Finance API to return monthlyRevenue, previousRevenue, previousExpenses
- Fixed Finance Component to compute real period changes instead of hardcoded +12.5%/+8.2%
- Fixed Finance Component to use real monthly data instead of flat average
- Fixed Attendance Component to use staff's actual branchId instead of 'default'
- Fixed Attendance API to calculate hoursWorked and update status on clock-out
- Created missing Waitlist API route (GET, POST, PATCH)
- Fixed Tips Module: enabled search, replaced UUID inputs with searchable dropdowns
- Fixed Gift Cards: removed client-side code generation (server already handles it)
- Fixed POS: category icons now use API icon field with fallback to hardcoded map
- Added $transaction wrappers to Loyalty API (3 writes now atomic)
- Added $transaction wrappers to Inventory API (read-then-write now atomic)
- Added $transaction wrappers to Gift Cards API (card + transaction now atomic)
- Updated Prisma schema: added Customer relation to Tip model
- Ran db:push successfully
- Build succeeded with all changes

Stage Summary:
- All 8 critical issues fixed
- All 5 moderate issues fixed
- All API endpoints tested and working
- No lint errors from new code
- Build successful
---
Task ID: 1
Agent: Main Agent
Task: Fix customer selection popup - move customer selection above service search bar following flow: Customer → Service → Staff → Add to Cart

Work Log:
- Read the full POS component (1445 lines) to understand current layout structure
- Analyzed uploaded screenshot showing the customer picker dialog
- Moved customer selector from cart sidebar to the TOP of the left panel (above search bar)
- Added new customer selector row with gradient background, user icon, customer details, and Change/Select button with chevron
- Removed customer selector from the desktop cart sidebar
- Removed customer selector from the mobile cart section
- Redesigned customer picker dialog with gradient header, step indicator ("Step 1 of 3 — Customer → Service → Staff"), larger avatars, search with clear button, Walk-in option with "Selected" badge, toast notifications on selection, footer with keyboard hints, and deselect button
- Redesigned staff picker dialog to match same design language with gradient header ("Step 3 of 3"), larger service info card with icon, larger staff avatars, and footer hints
- Verified with Agent Browser - all checks pass

Stage Summary:
- Customer selector now appears ABOVE the search bar following the correct flow: Customer → Service → Staff → Cart
- Both customer and staff picker dialogs redesigned with consistent gradient headers and step indicators
- Cart sidebar simplified (no customer selector) - shows only summary
- All functionality verified working via Agent Browser
