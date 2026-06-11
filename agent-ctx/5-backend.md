---
Task ID: 5
Agent: Backend
Task: Create comprehensive enterprise-level Sales Reports API

Work Log:
- Read worklog.md for context on prior work (Tasks 1-4: cross-origin fix, owner APIs, suppliers/payroll/coupons modules, auth fixes)
- Read prisma/schema.prisma to understand all relevant models: Invoice, InvoiceItem, Product, ProductCategory, Service, ServiceCategory, Staff, Branch, Customer, Appointment, AppointmentService, Expense
- Read existing API patterns from dashboard/route.ts for code style reference
- Created `/src/app/api/sales-reports/route.ts` with all 7 report types:

1. **sales-summary** - Sales Dashboard Overview:
   - Total Sales, Returns, Net Sales, Tax, Discount
   - COGS calculation from Product.costPrice * quantity
   - Gross Profit and Margin %
   - Average Order Value, Total Items Sold, Total Invoices
   - Sales by Type (service/product/combo breakdown)
   - Payment method breakdown
   - Daily and Monthly sales trend data
   - Top 10 selling items by revenue

2. **sales-item** - Item-wise Sales Report:
   - InvoiceItems grouped by name+itemType
   - Columns: Name, Type, Category, Qty Sold, Unit Price, Total Revenue, % of Total Sales, Avg Discount
   - Category enrichment via ServiceCategory and ProductCategory lookup maps
   - Sorted by revenue and quantity (separate views)
   - Top 20 items for bar chart, top/bottom 5 performers
   - Filterable by itemType query param

3. **sales-category** - Category-wise Sales Report:
   - Service categories with total sold, revenue, avg price, % of service revenue
   - Product categories with total sold, revenue, avg price, % of product revenue, avg margin
   - Combined comparison view across all categories
   - Pie chart data for category distribution
   - Category lookup via ServiceCategory->Service and ProductCategory->Product relations

4. **sales-gross-profit** - Gross Profit Report:
   - Revenue by type (service, product, membership, package)
   - COGS from Product.costPrice * quantity for product items
   - Gross Profit = Revenue - COGS (products) and Revenue (services, no COGS)
   - Gross Profit Margin % by type and overall
   - Monthly gross profit trend
   - Product-level GP breakdown: name, revenue, cost, GP, margin %
   - Service-level contribution (100% margin)

5. **sales-cost** - Cost-wise Sales Analysis:
   - Total COGS by product category
   - Cost vs Selling Price analysis per product (with SKU, brand)
   - Markup % per category and per product
   - Highest/lowest margin products (top/bottom 10)
   - Monthly cost trend
   - Break-even analysis using Expense data (fixed costs from rent/utilities/payroll/maintenance)
   - Contribution margin and break-even revenue calculation

6. **sales-retail** - Retail Product Sales Report:
   - Product-only items with name, SKU, brand, category, qty, unit price, revenue, cost, margin, margin %
   - Sales by brand breakdown
   - Sales by product category
   - Top retail performers (by revenue)
   - Slow-moving retail items (by qty sold)
   - Retail vs Service revenue comparison
   - Monthly retail trend

7. **sales-salesperson** - Salesperson-wise Sales Report:
   - Sales grouped by InvoiceItem.staffId
   - Staff name, role, total sales, items sold, avg sale value, unique customers
   - Service vs Product sales breakdown per salesperson
   - Commission-eligible sales (totalSales * commissionRate)
   - Top 10 performers ranking
   - Monthly sales trend per top 5 salesperson
   - Sales by branch per salesperson
   - Unattributed sales tracking (items without staffId)

- Shared helpers: buildProductCostMap, buildServiceCategoryMap, buildProductCategoryMap
- All monetary values rounded to 2 decimal places
- Consistent response format: { success, data: { summary, charts, details } }
- Proper error handling with try/catch and typed errors
- Date filtering via from/to query params (defaults to current month start → today)
- Branch and staff filtering supported
- Excludes refunded invoices from all calculations
- Removed unused `eachMonthOfInterval` import after initial lint check
- ESLint passes with zero errors
- Dev server running successfully

Stage Summary:
- Single comprehensive API route file created at /src/app/api/sales-reports/route.ts (~800 lines)
- All 7 report types fully implemented with Prisma queries + JS aggregation
- Product COGS calculated via separate Product table lookup map
- Salesperson attribution via InvoiceItem.staffId with null handling
- Consistent patterns: import { db }, NextRequest/NextResponse, { success, data/error } format
- Category enrichment for items via ServiceCategory/ProductCategory relationship maps
- Break-even analysis leverages existing Expense model for fixed costs
- All chart data structures ready for frontend visualization (Recharts-compatible)
