---
Task ID: 1
Agent: Main
Task: Implement all requested features - module visibility, service tax form, POS tax calculation, keyboard navigation

Work Log:
- Updated Prisma schema to add `taxRate` (Float, default 0) and `taxType` (String, default "none") fields to Service model
- Pushed schema changes to database with `bun run db:push`
- Changed demo auth route to set role='admin' instead of 'viewer', name='Demo Admin' instead of 'Demo Viewer'
- Updated main-app-shell.tsx: changed viewerRestrictedModules from ['owner', 'settings', 'pos'] to just ['owner']
- Updated restriction check to use isNotOwner instead of isViewer, so all non-owner roles see all modules except owner panel
- Updated toast message from "This module requires admin access" to "This module requires owner access"
- Rewrote services.tsx with professional section-based form layout:
  - Dialog size increased from sm:max-w-md to sm:max-w-2xl with max-h-[90vh] overflow-y-auto
  - Section 1: Basic Information (Scissors icon) - Service Name, Category, Description
  - Section 2: Pricing & Duration (DollarSign icon) - Duration, Price
  - Section 3: Tax Configuration (Percent icon) - Tax Type select (None/Included/Excluded), Tax Rate %, helper text
  - Added taxRate and taxType to Service interface, form state, handlers
  - Added tax column in service tables with color-coded badges
  - Professional styling: uppercase tracking labels, h-11 inputs, section dividers
- Updated services API route to handle taxRate and taxType in POST and PATCH handlers
- Updated POS component with per-service tax calculation and tax mode toggle:
  - Added taxRate and taxType to ServiceType and CartItem interfaces
  - Added posTaxMode state ('included'|'excluded'|'none') defaulting to 'included'
  - Per-service tax calculation: totalTax computed from each cart item's taxRate/taxType
  - Grand total based on mode: Included = subtotal+tax, Excluded = subtotal-tax, None = subtotal
  - Added Tax Mode toggle in both desktop and mobile cart panels
  - Updated renderTaxLine, checkout dialog, receipt to use new tax calculation
  - Updated handleCompleteSale to send correct tax amount
- Added keyboard navigation to POS:
  - Added highlightedIndex state, searchInputRef and serviceListRef refs
  - ArrowUp/ArrowDown to navigate filtered services, Enter to add highlighted service
  - Auto-scroll to highlighted item
  - Visual highlight with ring-2 ring-rose-500/30 on selected service
  - Updated search placeholder to include navigation instructions
  - data-service-index attribute on service buttons for scroll targeting
- Tested all features with Agent Browser:
  - All modules visible except Owner Panel (restricted for non-owners) ✅
  - Professional service form with tax configuration sections ✅
  - Tax mode toggle on POS (Included/Excluded/No Tax) working ✅
  - Included: Grand Total = subtotal + tax ✅
  - Excluded: Grand Total = subtotal - tax ✅
  - No Tax: Grand Total = subtotal (tax line hidden) ✅
  - Keyboard navigation: ArrowUp/Down to navigate, Enter to add ✅
  - Created test services with tax via API and verified POS calculation ✅
- Rebuilt application after all changes with clean .next directory

Stage Summary:
- All 5 requested features implemented and verified
- Demo account now has admin role with full access to all modules except Owner Panel
- Service form is professional with sections, larger size, and tax configuration
- POS tax calculation works with per-service tax rates and 3-mode toggle
- Keyboard navigation (type, arrows, enter) works on POS service grid
