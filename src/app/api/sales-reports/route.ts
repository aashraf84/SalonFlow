import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { format, startOfMonth, endOfDay, startOfDay } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportResponse {
  success: boolean
  data?: {
    summary: Record<string, unknown>
    charts: Record<string, unknown>
    details: Record<string, unknown>
  }
  error?: string
}

type ReportType =
  | 'sales-summary'
  | 'sales-item'
  | 'sales-category'
  | 'sales-gross-profit'
  | 'sales-cost'
  | 'sales-retail'
  | 'sales-salesperson'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function parseDate(dateStr: string | null, fallback: Date): Date {
  if (!dateStr) return fallback
  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? fallback : parsed
}

function buildDateRange(from: string | null, to: string | null) {
  const now = new Date()
  const fromDate = startOfDay(parseDate(from, startOfMonth(now)))
  const toDate = endOfDay(parseDate(to, now))
  return { fromDate, toDate }
}

function buildInvoiceWhere(fromDate: Date, toDate: Date, branchId?: string | null) {
  const where: Record<string, unknown> = {
    createdAt: { gte: fromDate, lte: toDate },
  }
  if (branchId) {
    where.branchId = branchId
  }
  return where
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse<ReportResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as ReportType | null
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const itemType = searchParams.get('itemType') ?? 'all'
    const branchId = searchParams.get('branchId')
    const staffId = searchParams.get('staffId')

    // Validate report type
    const validTypes: ReportType[] = [
      'sales-summary',
      'sales-item',
      'sales-category',
      'sales-gross-profit',
      'sales-cost',
      'sales-retail',
      'sales-salesperson',
    ]
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid or missing report type. Valid types: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const { fromDate, toDate } = buildDateRange(from, to)

    switch (type) {
      case 'sales-summary':
        return NextResponse.json({
          success: true,
          data: await getSalesSummary(fromDate, toDate, branchId),
        })
      case 'sales-item':
        return NextResponse.json({
          success: true,
          data: await getSalesItemReport(fromDate, toDate, itemType, branchId),
        })
      case 'sales-category':
        return NextResponse.json({
          success: true,
          data: await getSalesCategoryReport(fromDate, toDate, branchId),
        })
      case 'sales-gross-profit':
        return NextResponse.json({
          success: true,
          data: await getSalesGrossProfitReport(fromDate, toDate, branchId),
        })
      case 'sales-cost':
        return NextResponse.json({
          success: true,
          data: await getSalesCostReport(fromDate, toDate, branchId),
        })
      case 'sales-retail':
        return NextResponse.json({
          success: true,
          data: await getSalesRetailReport(fromDate, toDate, branchId),
        })
      case 'sales-salesperson':
        return NextResponse.json({
          success: true,
          data: await getSalesSalespersonReport(fromDate, toDate, branchId, staffId),
        })
      default:
        return NextResponse.json({ success: false, error: 'Unhandled report type' }, { status: 400 })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('[Sales Reports API]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── 1. Sales Summary ─────────────────────────────────────────────────────────

async function getSalesSummary(fromDate: Date, toDate: Date, branchId?: string | null) {
  const invoiceWhere = buildInvoiceWhere(fromDate, toDate, branchId)

  // Fetch all invoices with items in the date range
  const invoices = await db.invoice.findMany({
    where: invoiceWhere,
    include: {
      items: true,
      branch: { select: { id: true, name: true } },
    },
  })

  // Separate regular sales vs refunds
  const paidInvoices = invoices.filter((inv) => inv.paymentStatus !== 'refunded')
  const refundedInvoices = invoices.filter((inv) => inv.paymentStatus === 'refunded')

  const totalSales = round2(paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0))
  const totalReturns = round2(refundedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0))
  const netSales = round2(totalSales - totalReturns)
  const totalTax = round2(paidInvoices.reduce((sum, inv) => sum + inv.tax, 0))
  const totalDiscount = round2(paidInvoices.reduce((sum, inv) => sum + inv.discount, 0))

  // Calculate COGS for product items in paid invoices
  const productItems = paidInvoices.flatMap((inv) =>
    inv.items.filter((item) => item.itemType === 'product')
  )
  const productCostMap = await buildProductCostMap(productItems.map((i) => i.itemId).filter(Boolean) as string[])
  const totalCOGS = round2(
    productItems.reduce((sum, item) => {
      const costPrice = productCostMap[item.itemId ?? ''] ?? 0
      return sum + costPrice * item.quantity
    }, 0)
  )

  const grossProfit = round2(netSales - totalCOGS)
  const grossProfitMargin = netSales > 0 ? round2((grossProfit / netSales) * 100) : 0

  // Average order value
  const totalPaidInvoices = paidInvoices.length
  const avgOrderValue = totalPaidInvoices > 0 ? round2(totalSales / totalPaidInvoices) : 0

  // Total items sold
  const allPaidItems = paidInvoices.flatMap((inv) => inv.items)
  const totalItemsSold = allPaidItems.reduce((sum, item) => sum + item.quantity, 0)

  // Sales by invoice type
  const salesByType: Record<string, { count: number; revenue: number }> = {}
  for (const inv of paidInvoices) {
    if (!salesByType[inv.type]) {
      salesByType[inv.type] = { count: 0, revenue: 0 }
    }
    salesByType[inv.type].count++
    salesByType[inv.type].revenue += inv.totalAmount
  }
  for (const key of Object.keys(salesByType)) {
    salesByType[key].revenue = round2(salesByType[key].revenue)
  }

  // Payment method breakdown
  const paymentMethodBreakdown: Record<string, { count: number; revenue: number }> = {}
  for (const inv of paidInvoices) {
    if (!paymentMethodBreakdown[inv.paymentMethod]) {
      paymentMethodBreakdown[inv.paymentMethod] = { count: 0, revenue: 0 }
    }
    paymentMethodBreakdown[inv.paymentMethod].count++
    paymentMethodBreakdown[inv.paymentMethod].revenue += inv.totalAmount
  }
  for (const key of Object.keys(paymentMethodBreakdown)) {
    paymentMethodBreakdown[key].revenue = round2(paymentMethodBreakdown[key].revenue)
  }

  // Daily sales trend
  const dailyTrend: Record<string, { sales: number; invoices: number }> = {}
  for (const inv of paidInvoices) {
    const dayKey = format(new Date(inv.createdAt), 'yyyy-MM-dd')
    if (!dailyTrend[dayKey]) {
      dailyTrend[dayKey] = { sales: 0, invoices: 0 }
    }
    dailyTrend[dayKey].sales += inv.totalAmount
    dailyTrend[dayKey].invoices++
  }
  for (const key of Object.keys(dailyTrend)) {
    dailyTrend[key].sales = round2(dailyTrend[key].sales)
  }

  // Monthly sales trend
  const monthlyTrend: Record<string, { sales: number; invoices: number; refunds: number }> = {}
  for (const inv of paidInvoices) {
    const monthKey = format(new Date(inv.createdAt), 'yyyy-MM')
    if (!monthlyTrend[monthKey]) {
      monthlyTrend[monthKey] = { sales: 0, invoices: 0, refunds: 0 }
    }
    monthlyTrend[monthKey].sales += inv.totalAmount
    monthlyTrend[monthKey].invoices++
  }
  for (const inv of refundedInvoices) {
    const monthKey = format(new Date(inv.createdAt), 'yyyy-MM')
    if (!monthlyTrend[monthKey]) {
      monthlyTrend[monthKey] = { sales: 0, invoices: 0, refunds: 0 }
    }
    monthlyTrend[monthKey].refunds += inv.totalAmount
  }
  for (const key of Object.keys(monthlyTrend)) {
    monthlyTrend[key].sales = round2(monthlyTrend[key].sales)
    monthlyTrend[key].refunds = round2(monthlyTrend[key].refunds)
  }

  // Top 10 selling items (by revenue)
  const itemRevenueMap: Record<string, { name: string; type: string; qty: number; revenue: number }> = {}
  for (const item of allPaidItems) {
    const key = `${item.name}|||${item.itemType}`
    if (!itemRevenueMap[key]) {
      itemRevenueMap[key] = { name: item.name, type: item.itemType, qty: 0, revenue: 0 }
    }
    itemRevenueMap[key].qty += item.quantity
    itemRevenueMap[key].revenue += item.total
  }
  const top10Items = Object.values(itemRevenueMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((item) => ({ ...item, revenue: round2(item.revenue) }))

  return {
    summary: {
      totalSales,
      totalReturns,
      netSales,
      totalTax,
      totalDiscount,
      totalCOGS,
      grossProfit,
      grossProfitMargin,
      avgOrderValue,
      totalItemsSold,
      totalInvoices: invoices.length,
      paidInvoices: totalPaidInvoices,
      refundedInvoices: refundedInvoices.length,
      salesByType,
      paymentMethodBreakdown,
    },
    charts: {
      dailyTrend,
      monthlyTrend,
      top10Items,
      salesByTypeDistribution: Object.entries(salesByType).map(([type, data]) => ({
        type,
        ...data,
        percentage: totalSales > 0 ? round2((data.revenue / totalSales) * 100) : 0,
      })),
      paymentMethodDistribution: Object.entries(paymentMethodBreakdown).map(([method, data]) => ({
        method,
        ...data,
        percentage: totalSales > 0 ? round2((data.revenue / totalSales) * 100) : 0,
      })),
    },
    details: {
      dateRange: {
        from: format(fromDate, 'yyyy-MM-dd'),
        to: format(toDate, 'yyyy-MM-dd'),
      },
      branchId: branchId || null,
    },
  }
}

// ─── 2. Item-wise Sales Report ────────────────────────────────────────────────

async function getSalesItemReport(
  fromDate: Date,
  toDate: Date,
  itemType: string,
  branchId?: string | null
) {
  const invoiceWhere = buildInvoiceWhere(fromDate, toDate, branchId)

  const invoices = await db.invoice.findMany({
    where: { ...invoiceWhere, paymentStatus: { not: 'refunded' } },
    include: { items: true },
  })

  const allItems = invoices.flatMap((inv) => inv.items)

  // Filter by itemType if specified
  const filteredItems =
    itemType === 'all' ? allItems : allItems.filter((item) => item.itemType === itemType)

  // Group by name + itemType
  const itemMap: Record<
    string,
    { name: string; itemType: string; qty: number; totalRevenue: number; totalDiscount: number; count: number }
  > = {}
  for (const item of filteredItems) {
    const key = `${item.name}|||${item.itemType}`
    if (!itemMap[key]) {
      itemMap[key] = { name: item.name, itemType: item.itemType, qty: 0, totalRevenue: 0, totalDiscount: 0, count: 0 }
    }
    itemMap[key].qty += item.quantity
    itemMap[key].totalRevenue += item.total
    itemMap[key].totalDiscount += item.discount
    itemMap[key].count++
  }

  const totalSales = round2(filteredItems.reduce((sum, item) => sum + item.total, 0))

  // Enrich with category info
  const serviceCategoryMap = await buildServiceCategoryMap()
  const productCategoryMap = await buildProductCategoryMap()

  const items = Object.values(itemMap).map((item) => {
    const avgDiscount = item.count > 0 ? round2(item.totalDiscount / item.count) : 0
    const percentageOfTotal = totalSales > 0 ? round2((item.totalRevenue / totalSales) * 100) : 0
    const unitPrice = item.qty > 0 ? round2(item.totalRevenue / item.qty) : 0

    const category =
      item.itemType === 'service'
        ? (serviceCategoryMap[item.name] ?? 'Uncategorized')
        : item.itemType === 'product'
          ? (productCategoryMap[item.name] ?? 'Uncategorized')
          : 'N/A'

    return {
      name: item.name,
      type: item.itemType,
      category,
      qtySold: item.qty,
      unitPrice,
      totalRevenue: round2(item.totalRevenue),
      percentageOfTotal,
      avgDiscount,
    }
  })

  // Sort by revenue (default)
  items.sort((a, b) => b.totalRevenue - a.totalRevenue)

  // Top 20 for bar chart
  const top20Items = items.slice(0, 20)

  // Top and bottom performers
  const topPerformers = items.slice(0, 5)
  const bottomPerformers = items.length > 5 ? items.slice(-5).reverse() : []

  // Also sort by quantity
  const itemsByQty = [...items].sort((a, b) => b.qtySold - a.qtySold)

  return {
    summary: {
      totalItems: items.length,
      totalQtySold: items.reduce((sum, i) => sum + i.qtySold, 0),
      totalRevenue: round2(items.reduce((sum, i) => sum + i.totalRevenue, 0)),
      avgItemRevenue: items.length > 0 ? round2(items.reduce((sum, i) => sum + i.totalRevenue, 0) / items.length) : 0,
      totalDiscount: round2(filteredItems.reduce((sum, i) => sum + i.discount, 0)),
      filteredBy: itemType,
    },
    charts: {
      top20Items: top20Items.map((item) => ({
        name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
        revenue: item.totalRevenue,
        qty: item.qtySold,
        type: item.type,
      })),
      revenueByType: Object.entries(
        items.reduce<Record<string, number>>((acc, i) => {
          acc[i.type] = (acc[i.type] || 0) + i.totalRevenue
          return acc
        }, {})
      ).map(([type, revenue]) => ({ type, revenue: round2(revenue) })),
    },
    details: {
      items,
      itemsByQty,
      topPerformers,
      bottomPerformers,
    },
  }
}

// ─── 3. Category-wise Sales Report ────────────────────────────────────────────

async function getSalesCategoryReport(fromDate: Date, toDate: Date, branchId?: string | null) {
  const invoiceWhere = buildInvoiceWhere(fromDate, toDate, branchId)

  const invoices = await db.invoice.findMany({
    where: { ...invoiceWhere, paymentStatus: { not: 'refunded' } },
    include: { items: true },
  })

  const allItems = invoices.flatMap((inv) => inv.items)

  // Fetch all service and product categories with their items
  const serviceCategories = await db.serviceCategory.findMany({
    include: { services: { select: { id: true, name: true, price: true } } },
  })

  const productCategories = await db.productCategory.findMany({
    include: { products: { select: { id: true, name: true, sellingPrice: true, costPrice: true } } },
  })

  // Build lookup maps: itemName -> category info
  const serviceToCategory: Record<string, { categoryId: string; categoryName: string; price: number }> = {}
  for (const cat of serviceCategories) {
    for (const svc of cat.services) {
      serviceToCategory[svc.name] = { categoryId: cat.id, categoryName: cat.name, price: svc.price }
    }
  }

  const productToCategory: Record<string, { categoryId: string; categoryName: string; sellingPrice: number; costPrice: number }> = {}
  for (const cat of productCategories) {
    for (const prod of cat.products) {
      productToCategory[prod.name] = { categoryId: cat.id, categoryName: cat.name, sellingPrice: prod.sellingPrice, costPrice: prod.costPrice }
    }
  }

  // Aggregate service items by category
  const serviceCategoryAgg: Record<string, { categoryName: string; totalSold: number; revenue: number; totalPrice: number; count: number }> = {}
  const serviceItems = allItems.filter((item) => item.itemType === 'service')

  for (const item of serviceItems) {
    const catInfo = serviceToCategory[item.name]
    const catName = catInfo?.categoryName ?? 'Uncategorized'
    if (!serviceCategoryAgg[catName]) {
      serviceCategoryAgg[catName] = { categoryName: catName, totalSold: 0, revenue: 0, totalPrice: 0, count: 0 }
    }
    serviceCategoryAgg[catName].totalSold += item.quantity
    serviceCategoryAgg[catName].revenue += item.total
    serviceCategoryAgg[catName].totalPrice += item.unitPrice
    serviceCategoryAgg[catName].count++
  }

  const totalServiceRevenue = round2(serviceItems.reduce((sum, i) => sum + i.total, 0))

  const serviceCategoryReport = Object.values(serviceCategoryAgg).map((cat) => ({
    categoryName: cat.categoryName,
    totalSold: cat.totalSold,
    revenue: round2(cat.revenue),
    avgPrice: cat.count > 0 ? round2(cat.totalPrice / cat.count) : 0,
    percentageOfServiceRevenue: totalServiceRevenue > 0 ? round2((cat.revenue / totalServiceRevenue) * 100) : 0,
  }))

  // Aggregate product items by category
  const productCategoryAgg: Record<string, { categoryName: string; totalSold: number; revenue: number; totalSellingPrice: number; totalCostPrice: number; count: number }> = {}
  const productItems = allItems.filter((item) => item.itemType === 'product')

  for (const item of productItems) {
    const catInfo = productToCategory[item.name]
    const catName = catInfo?.categoryName ?? 'Uncategorized'
    if (!productCategoryAgg[catName]) {
      productCategoryAgg[catName] = { categoryName: catName, totalSold: 0, revenue: 0, totalSellingPrice: 0, totalCostPrice: 0, count: 0 }
    }
    productCategoryAgg[catName].totalSold += item.quantity
    productCategoryAgg[catName].revenue += item.total
    productCategoryAgg[catName].totalSellingPrice += item.unitPrice
    productCategoryAgg[catName].totalCostPrice += catInfo?.costPrice ?? 0
    productCategoryAgg[catName].count++
  }

  const totalProductRevenue = round2(productItems.reduce((sum, i) => sum + i.total, 0))

  const productCategoryReport = Object.values(productCategoryAgg).map((cat) => {
    const totalCost = round2(cat.totalCostPrice * cat.totalSold)
    const margin = round2(cat.revenue - totalCost)
    return {
      categoryName: cat.categoryName,
      totalSold: cat.totalSold,
      revenue: round2(cat.revenue),
      avgPrice: cat.count > 0 ? round2(cat.totalSellingPrice / cat.count) : 0,
      percentageOfProductRevenue: totalProductRevenue > 0 ? round2((cat.revenue / totalProductRevenue) * 100) : 0,
      avgMargin: cat.revenue > 0 ? round2((margin / cat.revenue) * 100) : 0,
    }
  })

  // Combined comparison
  const allCategoryNames = [
    ...new Set([
      ...serviceCategoryReport.map((c) => c.categoryName),
      ...productCategoryReport.map((c) => c.categoryName),
    ]),
  ]

  const combinedView = allCategoryNames
    .map((catName) => {
      const svc = serviceCategoryReport.find((c) => c.categoryName === catName)
      const prod = productCategoryReport.find((c) => c.categoryName === catName)
      return {
        categoryName: catName,
        serviceRevenue: svc?.revenue ?? 0,
        serviceQty: svc?.totalSold ?? 0,
        productRevenue: prod?.revenue ?? 0,
        productQty: prod?.totalSold ?? 0,
        totalRevenue: round2((svc?.revenue ?? 0) + (prod?.revenue ?? 0)),
      }
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)

  // Pie chart data
  const pieData = [
    ...serviceCategoryReport.map((c) => ({ name: `${c.categoryName} (Service)`, value: c.revenue, type: 'service' })),
    ...productCategoryReport.map((c) => ({ name: `${c.categoryName} (Product)`, value: c.revenue, type: 'product' })),
  ]

  return {
    summary: {
      totalServiceCategories: serviceCategoryReport.length,
      totalProductCategories: productCategoryReport.length,
      totalServiceRevenue,
      totalProductRevenue,
      combinedRevenue: round2(totalServiceRevenue + totalProductRevenue),
    },
    charts: {
      serviceCategoryDistribution: serviceCategoryReport.map((c) => ({
        name: c.categoryName,
        value: c.revenue,
        percentage: c.percentageOfServiceRevenue,
      })),
      productCategoryDistribution: productCategoryReport.map((c) => ({
        name: c.categoryName,
        value: c.revenue,
        percentage: c.percentageOfProductRevenue,
      })),
      pieData,
      combinedComparison: combinedView.map((c) => ({
        name: c.categoryName,
        serviceRevenue: c.serviceRevenue,
        productRevenue: c.productRevenue,
        totalRevenue: c.totalRevenue,
      })),
    },
    details: {
      serviceCategories: serviceCategoryReport.sort((a, b) => b.revenue - a.revenue),
      productCategories: productCategoryReport.sort((a, b) => b.revenue - a.revenue),
      combinedView,
    },
  }
}

// ─── 4. Gross Profit Report ──────────────────────────────────────────────────

async function getSalesGrossProfitReport(fromDate: Date, toDate: Date, branchId?: string | null) {
  const invoiceWhere = buildInvoiceWhere(fromDate, toDate, branchId)

  const invoices = await db.invoice.findMany({
    where: { ...invoiceWhere, paymentStatus: { not: 'refunded' } },
    include: { items: true },
  })

  const allItems = invoices.flatMap((inv) => inv.items)

  // Revenue by type
  const serviceRevenue = round2(allItems.filter((i) => i.itemType === 'service').reduce((sum, i) => sum + i.total, 0))
  const productRevenue = round2(allItems.filter((i) => i.itemType === 'product').reduce((sum, i) => sum + i.total, 0))
  const membershipRevenue = round2(allItems.filter((i) => i.itemType === 'membership').reduce((sum, i) => sum + i.total, 0))
  const packageRevenue = round2(allItems.filter((i) => i.itemType === 'package').reduce((sum, i) => sum + i.total, 0))

  // COGS - only for product items
  const productItems = allItems.filter((i) => i.itemType === 'product')
  const productCostMap = await buildProductCostMap(productItems.map((i) => i.itemId).filter(Boolean) as string[])

  const totalCOGS = round2(
    productItems.reduce((sum, item) => {
      const costPrice = productCostMap[item.itemId ?? ''] ?? 0
      return sum + costPrice * item.quantity
    }, 0)
  )

  // Gross profit: Services have no COGS, so GP = Revenue for services
  const serviceGP = round2(serviceRevenue) // No COGS for services
  const productGP = round2(productRevenue - totalCOGS)
  const totalRevenue = round2(serviceRevenue + productRevenue + membershipRevenue + packageRevenue)
  const totalGP = round2(serviceGP + productGP)
  const totalGPMargin = totalRevenue > 0 ? round2((totalGP / totalRevenue) * 100) : 0

  const serviceGPMargin = serviceRevenue > 0 ? round2((serviceGP / serviceRevenue) * 100) : 0
  const productGPMargin = productRevenue > 0 ? round2((productGP / productRevenue) * 100) : 0

  // Monthly gross profit trend
  const monthlyGP: Record<string, { revenue: number; cogs: number; grossProfit: number; margin: number }> = {}

  for (const inv of invoices) {
    const monthKey = format(new Date(inv.createdAt), 'yyyy-MM')
    if (!monthlyGP[monthKey]) {
      monthlyGP[monthKey] = { revenue: 0, cogs: 0, grossProfit: 0, margin: 0 }
    }
    monthlyGP[monthKey].revenue += inv.totalAmount
  }

  // Calculate monthly COGS
  for (const inv of invoices) {
    const monthKey = format(new Date(inv.createdAt), 'yyyy-MM')
    const invProductItems = inv.items.filter((i) => i.itemType === 'product')
    for (const item of invProductItems) {
      const costPrice = productCostMap[item.itemId ?? ''] ?? 0
      monthlyGP[monthKey].cogs += costPrice * item.quantity
    }
  }

  for (const key of Object.keys(monthlyGP)) {
    monthlyGP[key].revenue = round2(monthlyGP[key].revenue)
    monthlyGP[key].cogs = round2(monthlyGP[key].cogs)
    monthlyGP[key].grossProfit = round2(monthlyGP[key].revenue - monthlyGP[key].cogs)
    monthlyGP[key].margin = monthlyGP[key].revenue > 0 ? round2((monthlyGP[key].grossProfit / monthlyGP[key].revenue) * 100) : 0
  }

  // Product-level gross profit breakdown
  const productGPAgg: Record<string, { name: string; revenue: number; cost: number; qty: number }> = {}
  for (const item of productItems) {
    if (!productGPAgg[item.name]) {
      productGPAgg[item.name] = { name: item.name, revenue: 0, cost: 0, qty: 0 }
    }
    productGPAgg[item.name].revenue += item.total
    productGPAgg[item.name].cost += (productCostMap[item.itemId ?? ''] ?? 0) * item.quantity
    productGPAgg[item.name].qty += item.quantity
  }

  const productGPBreakdown = Object.values(productGPAgg)
    .map((p) => {
      const gp = round2(p.revenue - p.cost)
      return {
        name: p.name,
        revenue: round2(p.revenue),
        cost: round2(p.cost),
        grossProfit: gp,
        margin: p.revenue > 0 ? round2((gp / p.revenue) * 100) : 0,
      }
    })
    .sort((a, b) => b.grossProfit - a.grossProfit)

  // Service-level contribution
  const serviceGPAgg: Record<string, { name: string; revenue: number; qty: number }> = {}
  const serviceItems = allItems.filter((i) => i.itemType === 'service')
  for (const item of serviceItems) {
    if (!serviceGPAgg[item.name]) {
      serviceGPAgg[item.name] = { name: item.name, revenue: 0, qty: 0 }
    }
    serviceGPAgg[item.name].revenue += item.total
    serviceGPAgg[item.name].qty += item.quantity
  }

  const serviceGPBreakdown = Object.values(serviceGPAgg)
    .map((s) => ({
      name: s.name,
      revenue: round2(s.revenue),
      grossProfit: round2(s.revenue), // Pure margin - no COGS
      margin: 100, // Services have 100% gross margin (no COGS)
      qty: s.qty,
    }))
    .sort((a, b) => b.grossProfit - a.grossProfit)

  return {
    summary: {
      totalRevenue,
      serviceRevenue,
      productRevenue,
      membershipRevenue,
      packageRevenue,
      totalCOGS,
      totalGP,
      totalGPMargin,
      serviceGP,
      serviceGPMargin,
      productGP,
      productGPMargin,
    },
    charts: {
      revenueByType: [
        { type: 'Service', revenue: serviceRevenue, gp: serviceGP, margin: serviceGPMargin },
        { type: 'Product', revenue: productRevenue, gp: productGP, margin: productGPMargin },
        ...(membershipRevenue > 0 ? [{ type: 'Membership', revenue: membershipRevenue, gp: round2(membershipRevenue), margin: 100 }] : []),
        ...(packageRevenue > 0 ? [{ type: 'Package', revenue: packageRevenue, gp: round2(packageRevenue), margin: 100 }] : []),
      ],
      monthlyGPTrend: Object.entries(monthlyGP)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data })),
    },
    details: {
      productGPBreakdown,
      serviceGPBreakdown,
      topProfitableProducts: productGPBreakdown.slice(0, 10),
      topProfitableServices: serviceGPBreakdown.slice(0, 10),
    },
  }
}

// ─── 5. Cost-wise Sales Analysis ─────────────────────────────────────────────

async function getSalesCostReport(fromDate: Date, toDate: Date, branchId?: string | null) {
  const invoiceWhere = buildInvoiceWhere(fromDate, toDate, branchId)

  const invoices = await db.invoice.findMany({
    where: { ...invoiceWhere, paymentStatus: { not: 'refunded' } },
    include: { items: true },
  })

  const productItems = invoices.flatMap((inv) =>
    inv.items.filter((item) => item.itemType === 'product')
  )

  const productCostMap = await buildProductCostMap(productItems.map((i) => i.itemId).filter(Boolean) as string[])

  // Fetch product details with category
  const products = await db.product.findMany({
    include: { category: { select: { id: true, name: true } } },
  })
  const productDetailMap: Record<string, {
    name: string; sku: string; brand: string | null;
    costPrice: number; sellingPrice: number; categoryName: string
  }> = {}
  for (const prod of products) {
    productDetailMap[prod.id] = {
      name: prod.name,
      sku: prod.sku,
      brand: prod.brand,
      costPrice: prod.costPrice,
      sellingPrice: prod.sellingPrice,
      categoryName: prod.category.name,
    }
  }

  // Total COGS by product category
  const cogsByCategory: Record<string, { categoryName: string; totalCost: number; totalRevenue: number; qty: number }> = {}
  for (const item of productItems) {
    const prodDetail = productDetailMap[item.itemId ?? '']
    const catName = prodDetail?.categoryName ?? 'Uncategorized'
    const costPrice = prodDetail?.costPrice ?? productCostMap[item.itemId ?? ''] ?? 0

    if (!cogsByCategory[catName]) {
      cogsByCategory[catName] = { categoryName: catName, totalCost: 0, totalRevenue: 0, qty: 0 }
    }
    cogsByCategory[catName].totalCost += costPrice * item.quantity
    cogsByCategory[catName].totalRevenue += item.total
    cogsByCategory[catName].qty += item.quantity
  }

  const cogsByCategoryReport = Object.values(cogsByCategory)
    .map((c) => {
      const markup = c.totalCost > 0 ? round2(((c.totalRevenue - c.totalCost) / c.totalCost) * 100) : 0
      return {
        categoryName: c.categoryName,
        totalCost: round2(c.totalCost),
        totalRevenue: round2(c.totalRevenue),
        qty: c.qty,
        markup,
      }
    })
    .sort((a, b) => b.totalCost - a.totalCost)

  // Cost vs Selling Price per product
  const costVsPriceAgg: Record<string, {
    name: string; sku: string; brand: string | null;
    categoryName: string; qty: number; totalCost: number; totalRevenue: number
  }> = {}
  for (const item of productItems) {
    const prodDetail = productDetailMap[item.itemId ?? '']
    const costPrice = prodDetail?.costPrice ?? productCostMap[item.itemId ?? ''] ?? 0

    if (!costVsPriceAgg[item.name]) {
      costVsPriceAgg[item.name] = {
        name: item.name,
        sku: prodDetail?.sku ?? 'N/A',
        brand: prodDetail?.brand ?? null,
        categoryName: prodDetail?.categoryName ?? 'Uncategorized',
        qty: 0,
        totalCost: 0,
        totalRevenue: 0,
      }
    }
    costVsPriceAgg[item.name].qty += item.quantity
    costVsPriceAgg[item.name].totalCost += costPrice * item.quantity
    costVsPriceAgg[item.name].totalRevenue += item.total
  }

  const costVsPriceReport = Object.values(costVsPriceAgg)
    .map((c) => {
      const grossProfit = round2(c.totalRevenue - c.totalCost)
      const margin = c.totalRevenue > 0 ? round2((grossProfit / c.totalRevenue) * 100) : 0
      const markup = c.totalCost > 0 ? round2((grossProfit / c.totalCost) * 100) : 0
      return {
        name: c.name,
        sku: c.sku,
        brand: c.brand,
        categoryName: c.categoryName,
        qty: c.qty,
        totalCost: round2(c.totalCost),
        totalRevenue: round2(c.totalRevenue),
        grossProfit,
        margin,
        markup,
      }
    })
    .sort((a, b) => b.margin - a.margin)

  // Highest and lowest margin products
  const highestMargin = costVsPriceReport.slice(0, 10)
  const lowestMargin = [...costVsPriceReport].sort((a, b) => a.margin - b.margin).slice(0, 10)

  // Monthly cost trend
  const monthlyCost: Record<string, { cost: number; revenue: number }> = {}
  for (const inv of invoices) {
    const monthKey = format(new Date(inv.createdAt), 'yyyy-MM')
    if (!monthlyCost[monthKey]) {
      monthlyCost[monthKey] = { cost: 0, revenue: 0 }
    }
    monthlyCost[monthKey].revenue += inv.totalAmount
    const invProductItems = inv.items.filter((i) => i.itemType === 'product')
    for (const item of invProductItems) {
      const costPrice = productDetailMap[item.itemId ?? '']?.costPrice ?? productCostMap[item.itemId ?? ''] ?? 0
      monthlyCost[monthKey].cost += costPrice * item.quantity
    }
  }
  for (const key of Object.keys(monthlyCost)) {
    monthlyCost[key].cost = round2(monthlyCost[key].cost)
    monthlyCost[key].revenue = round2(monthlyCost[key].revenue)
  }

  // Break-even analysis data
  const fixedExpenseResult = await db.expense.aggregate({
    where: {
      date: { gte: fromDate, lte: toDate },
      ...(branchId ? { branchId } : {}),
      category: { in: ['rent', 'utilities', 'payroll', 'maintenance'] },
    },
    _sum: { amount: true },
  })
  const totalFixedCosts = round2(fixedExpenseResult._sum.amount ?? 0)

  const totalVariableCost = round2(
    Object.values(cogsByCategory).reduce((sum, c) => sum + c.totalCost, 0)
  )
  const totalProductRevenue = round2(
    Object.values(cogsByCategory).reduce((sum, c) => sum + c.totalRevenue, 0)
  )
  const contributionMargin = totalProductRevenue > 0 ? round2(((totalProductRevenue - totalVariableCost) / totalProductRevenue) * 100) : 0
  const breakEvenRevenue = contributionMargin > 0 ? round2((totalFixedCosts / contributionMargin) * 100) : 0

  return {
    summary: {
      totalCOGS: round2(Object.values(cogsByCategory).reduce((sum, c) => sum + c.totalCost, 0)),
      totalProductRevenue,
      totalFixedCosts,
      totalVariableCost,
      contributionMargin,
      breakEvenRevenue,
    },
    charts: {
      cogsByCategory: cogsByCategoryReport,
      monthlyCostTrend: Object.entries(monthlyCost)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data })),
      markupByCategory: cogsByCategoryReport.map((c) => ({
        categoryName: c.categoryName,
        markup: c.markup,
        totalCost: c.totalCost,
        totalRevenue: c.totalRevenue,
      })),
    },
    details: {
      costVsPrice: costVsPriceReport,
      highestMargin,
      lowestMargin,
    },
  }
}

// ─── 6. Retail Product Sales Report ──────────────────────────────────────────

async function getSalesRetailReport(fromDate: Date, toDate: Date, branchId?: string | null) {
  const invoiceWhere = buildInvoiceWhere(fromDate, toDate, branchId)

  const invoices = await db.invoice.findMany({
    where: { ...invoiceWhere, paymentStatus: { not: 'refunded' } },
    include: { items: true },
  })

  const allItems = invoices.flatMap((inv) => inv.items)
  const productItems = allItems.filter((item) => item.itemType === 'product')
  const serviceItems = allItems.filter((item) => item.itemType === 'service')

  // Fetch product details
  const products = await db.product.findMany({
    include: { category: { select: { id: true, name: true } } },
  })
  const productDetailMap: Record<string, {
    name: string; sku: string; brand: string | null;
    costPrice: number; sellingPrice: number; categoryName: string; categoryId: string
  }> = {}
  for (const prod of products) {
    productDetailMap[prod.id] = {
      name: prod.name,
      sku: prod.sku,
      brand: prod.brand,
      costPrice: prod.costPrice,
      sellingPrice: prod.sellingPrice,
      categoryName: prod.category.name,
      categoryId: prod.category.id,
    }
  }

  // Build retail line items with product details
  const retailItems = productItems.map((item) => {
    const detail = productDetailMap[item.itemId ?? '']
    const costPrice = detail?.costPrice ?? 0
    const totalCost = costPrice * item.quantity
    const grossMargin = round2(item.total - totalCost)
    const marginPercent = item.total > 0 ? round2((grossMargin / item.total) * 100) : 0

    return {
      name: item.name,
      sku: detail?.sku ?? 'N/A',
      brand: detail?.brand ?? 'N/A',
      category: detail?.categoryName ?? 'Uncategorized',
      qtySold: item.quantity,
      unitPrice: round2(item.unitPrice),
      totalRevenue: round2(item.total),
      costPrice: round2(costPrice),
      totalCost: round2(totalCost),
      grossMargin,
      marginPercent,
    }
  })

  // Aggregate by product name (unique products)
  const productAgg: Record<string, {
    name: string; sku: string; brand: string; category: string;
    qtySold: number; totalRevenue: number; totalCost: number
  }> = {}
  for (const item of retailItems) {
    if (!productAgg[item.name]) {
      productAgg[item.name] = { name: item.name, sku: item.sku, brand: item.brand, category: item.category, qtySold: 0, totalRevenue: 0, totalCost: 0 }
    }
    productAgg[item.name].qtySold += item.qtySold
    productAgg[item.name].totalRevenue += item.totalRevenue
    productAgg[item.name].totalCost += item.totalCost
  }

  const productSummary = Object.values(productAgg)
    .map((p) => {
      const gm = round2(p.totalRevenue - p.totalCost)
      return {
        ...p,
        totalRevenue: round2(p.totalRevenue),
        totalCost: round2(p.totalCost),
        grossMargin: gm,
        marginPercent: p.totalRevenue > 0 ? round2((gm / p.totalRevenue) * 100) : 0,
      }
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)

  // Sales by brand
  const brandAgg: Record<string, { brand: string; qtySold: number; revenue: number }> = {}
  for (const item of retailItems) {
    const brand = item.brand || 'Unbranded'
    if (!brandAgg[brand]) {
      brandAgg[brand] = { brand, qtySold: 0, revenue: 0 }
    }
    brandAgg[brand].qtySold += item.qtySold
    brandAgg[brand].revenue += item.totalRevenue
  }
  const salesByBrand = Object.values(brandAgg)
    .map((b) => ({ ...b, revenue: round2(b.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)

  // Sales by product category
  const catAgg: Record<string, { category: string; qtySold: number; revenue: number }> = {}
  for (const item of retailItems) {
    if (!catAgg[item.category]) {
      catAgg[item.category] = { category: item.category, qtySold: 0, revenue: 0 }
    }
    catAgg[item.category].qtySold += item.qtySold
    catAgg[item.category].revenue += item.totalRevenue
  }
  const salesByCategory = Object.values(catAgg)
    .map((c) => ({ ...c, revenue: round2(c.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)

  // Top retail performers (by revenue)
  const topPerformers = productSummary.slice(0, 10)

  // Slow-moving items (low qty sold)
  const slowMoving = [...productSummary].sort((a, b) => a.qtySold - b.qtySold).slice(0, 10)

  // Retail vs Service comparison
  const retailRevenue = round2(productItems.reduce((sum, i) => sum + i.total, 0))
  const serviceRevenue = round2(serviceItems.reduce((sum, i) => sum + i.total, 0))
  const combinedRevenue = round2(retailRevenue + serviceRevenue)

  // Monthly retail trend
  const monthlyRetail: Record<string, { retailRevenue: number; retailQty: number; serviceRevenue: number }> = {}
  for (const inv of invoices) {
    const monthKey = format(new Date(inv.createdAt), 'yyyy-MM')
    if (!monthlyRetail[monthKey]) {
      monthlyRetail[monthKey] = { retailRevenue: 0, retailQty: 0, serviceRevenue: 0 }
    }
    for (const item of inv.items) {
      if (item.itemType === 'product') {
        monthlyRetail[monthKey].retailRevenue += item.total
        monthlyRetail[monthKey].retailQty += item.quantity
      } else if (item.itemType === 'service') {
        monthlyRetail[monthKey].serviceRevenue += item.total
      }
    }
  }
  for (const key of Object.keys(monthlyRetail)) {
    monthlyRetail[key].retailRevenue = round2(monthlyRetail[key].retailRevenue)
    monthlyRetail[key].serviceRevenue = round2(monthlyRetail[key].serviceRevenue)
  }

  return {
    summary: {
      totalRetailRevenue: retailRevenue,
      totalServiceRevenue: serviceRevenue,
      combinedRevenue,
      retailPercentage: combinedRevenue > 0 ? round2((retailRevenue / combinedRevenue) * 100) : 0,
      totalProductsSold: productItems.reduce((sum, i) => sum + i.quantity, 0),
      uniqueProducts: productSummary.length,
      avgRetailMargin: productSummary.length > 0 ? round2(productSummary.reduce((sum, p) => sum + p.marginPercent, 0) / productSummary.length) : 0,
    },
    charts: {
      salesByBrand,
      salesByCategory,
      retailVsService: [
        { type: 'Retail', revenue: retailRevenue },
        { type: 'Service', revenue: serviceRevenue },
      ],
      monthlyRetailTrend: Object.entries(monthlyRetail)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data })),
    },
    details: {
      products: productSummary,
      topPerformers,
      slowMoving,
    },
  }
}

// ─── 7. Salesperson-wise Sales Report ────────────────────────────────────────

async function getSalesSalespersonReport(
  fromDate: Date,
  toDate: Date,
  branchId?: string | null,
  staffId?: string | null
) {
  const invoiceWhere = buildInvoiceWhere(fromDate, toDate, branchId)

  const invoices = await db.invoice.findMany({
    where: { ...invoiceWhere, paymentStatus: { not: 'refunded' } },
    include: {
      items: true,
      branch: { select: { id: true, name: true } },
    },
  })

  // Fetch all staff
  const staffMembers = await db.staff.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      specialization: true,
      commissionRate: true,
      branchId: true,
      branch: { select: { id: true, name: true } },
    },
  })
  const staffMap: Record<string, {
    firstName: string; lastName: string; email: string; role: string;
    specialization: string | null; commissionRate: number; branchId: string; branchName: string
  }> = {}
  for (const s of staffMembers) {
    staffMap[s.id] = {
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      role: s.role,
      specialization: s.specialization,
      commissionRate: s.commissionRate,
      branchId: s.branchId,
      branchName: s.branch.name,
    }
  }

  // Aggregate by staffId from invoice items
  const staffAgg: Record<string, {
    staffId: string; totalSales: number; totalItemsSold: number;
    serviceSales: number; productSales: number; membershipSales: number; packageSales: number;
    uniqueCustomers: Set<string>; uniqueBranches: Set<string>;
    monthlySales: Record<string, number>; salesCount: number
  }> = {}

  // Track unique customers per staff
  const invoiceCustomerMap: Record<string, string | null> = {}
  for (const inv of invoices) {
    invoiceCustomerMap[inv.id] = inv.customerId
  }

  for (const inv of invoices) {
    for (const item of inv.items) {
      if (!item.staffId) continue // Skip items without staff attribution

      // If specific staffId filter is provided, skip others
      if (staffId && item.staffId !== staffId) continue

      if (!staffAgg[item.staffId]) {
        staffAgg[item.staffId] = {
          staffId: item.staffId,
          totalSales: 0,
          totalItemsSold: 0,
          serviceSales: 0,
          productSales: 0,
          membershipSales: 0,
          packageSales: 0,
          uniqueCustomers: new Set(),
          uniqueBranches: new Set(),
          monthlySales: {},
          salesCount: 0,
        }
      }

      const agg = staffAgg[item.staffId]
      agg.totalSales += item.total
      agg.totalItemsSold += item.quantity
      agg.salesCount++

      // Sales by type
      if (item.itemType === 'service') agg.serviceSales += item.total
      else if (item.itemType === 'product') agg.productSales += item.total
      else if (item.itemType === 'membership') agg.membershipSales += item.total
      else if (item.itemType === 'package') agg.packageSales += item.total

      // Track unique customers
      const custId = invoiceCustomerMap[item.invoiceId]
      if (custId) agg.uniqueCustomers.add(custId)

      // Track unique branches
      agg.uniqueBranches.add(inv.branchId)

      // Monthly sales
      const monthKey = format(new Date(inv.createdAt), 'yyyy-MM')
      agg.monthlySales[monthKey] = (agg.monthlySales[monthKey] ?? 0) + item.total
    }
  }

  // Build report
  const salespersonReport = Object.values(staffAgg)
    .map((agg) => {
      const staff = staffMap[agg.staffId]
      const name = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown Staff'
      const avgSaleValue = agg.salesCount > 0 ? round2(agg.totalSales / agg.salesCount) : 0
      const commissionEligible = round2(agg.totalSales * (staff?.commissionRate ?? 0))

      return {
        staffId: agg.staffId,
        name,
        email: staff?.email ?? 'N/A',
        role: staff?.role ?? 'N/A',
        specialization: staff?.specialization ?? null,
        totalSales: round2(agg.totalSales),
        totalItemsSold: agg.totalItemsSold,
        avgSaleValue,
        uniqueCustomers: agg.uniqueCustomers.size,
        serviceSales: round2(agg.serviceSales),
        productSales: round2(agg.productSales),
        membershipSales: round2(agg.membershipSales),
        packageSales: round2(agg.packageSales),
        commissionRate: staff?.commissionRate ?? 0,
        commissionEligible,
        branchName: staff?.branchName ?? 'N/A',
        branchesWorked: agg.uniqueBranches.size,
      }
    })
    .sort((a, b) => b.totalSales - a.totalSales)

  // Top performers
  const topPerformers = salespersonReport.slice(0, 10)

  // Monthly sales trend for top 5 salespersons
  const top5Ids = topPerformers.slice(0, 5).map((s) => s.staffId)
  const monthlySalesTrend: Record<string, Record<string, number>> = {}

  for (const agg of Object.values(staffAgg)) {
    if (!top5Ids.includes(agg.staffId)) continue
    const staff = staffMap[agg.staffId]
    const name = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown'
    for (const [month, sales] of Object.entries(agg.monthlySales)) {
      if (!monthlySalesTrend[month]) {
        monthlySalesTrend[month] = {}
      }
      monthlySalesTrend[month][name] = round2(sales)
    }
  }

  // Sales by branch per salesperson
  const branchSales: Record<string, Record<string, number>> = {}
  for (const inv of invoices) {
    for (const item of inv.items) {
      if (!item.staffId) continue
      if (staffId && item.staffId !== staffId) continue
      const staff = staffMap[item.staffId]
      const name = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown'
      const branchName = inv.branch.name
      if (!branchSales[name]) branchSales[name] = {}
      branchSales[name][branchName] = (branchSales[name][branchName] ?? 0) + item.total
    }
  }
  // Round branch sales
  for (const name of Object.keys(branchSales)) {
    for (const br of Object.keys(branchSales[name])) {
      branchSales[name][br] = round2(branchSales[name][br])
    }
  }

  // Unattributed sales (items without staffId)
  const unattributedItems = invoices.flatMap((inv) => inv.items).filter((i) => !i.staffId)
  const unattributedSales = round2(unattributedItems.reduce((sum, i) => sum + i.total, 0))
  const unattributedCount = unattributedItems.length

  return {
    summary: {
      totalSalespeople: salespersonReport.length,
      totalAttributedSales: round2(salespersonReport.reduce((sum, s) => sum + s.totalSales, 0)),
      totalCommissionEligible: round2(salespersonReport.reduce((sum, s) => sum + s.commissionEligible, 0)),
      unattributedSales,
      unattributedItems: unattributedCount,
      avgSalesPerPerson: salespersonReport.length > 0
        ? round2(salespersonReport.reduce((sum, s) => sum + s.totalSales, 0) / salespersonReport.length)
        : 0,
    },
    charts: {
      topPerformersChart: topPerformers.map((s) => ({
        name: s.name,
        totalSales: s.totalSales,
        serviceSales: s.serviceSales,
        productSales: s.productSales,
      })),
      monthlySalesTrend: Object.entries(monthlySalesTrend)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, salesByPerson]) => ({ month, ...salesByPerson })),
      salesTypeDistribution: salespersonReport.map((s) => ({
        name: s.name,
        service: s.serviceSales,
        product: s.productSales,
        membership: s.membershipSales,
        package: s.packageSales,
      })),
    },
    details: {
      salespeople: salespersonReport,
      topPerformers,
      branchSales,
    },
  }
}

// ─── Shared Helper: Build product cost map ────────────────────────────────────

async function buildProductCostMap(productItemIds: string[]): Promise<Record<string, number>> {
  if (productItemIds.length === 0) return {}

  const uniqueIds = [...new Set(productItemIds.filter(Boolean))]
  if (uniqueIds.length === 0) return {}

  const products = await db.product.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, costPrice: true },
  })

  const map: Record<string, number> = {}
  for (const p of products) {
    map[p.id] = p.costPrice
  }
  return map
}

// ─── Shared Helper: Build service category name map (by service name) ────────

async function buildServiceCategoryMap(): Promise<Record<string, string>> {
  const categories = await db.serviceCategory.findMany({
    include: { services: { select: { name: true } } },
  })

  const map: Record<string, string> = {}
  for (const cat of categories) {
    for (const svc of cat.services) {
      map[svc.name] = cat.name
    }
  }
  return map
}

// ─── Shared Helper: Build product category name map (by product name) ─────────

async function buildProductCategoryMap(): Promise<Record<string, string>> {
  const categories = await db.productCategory.findMany({
    include: { products: { select: { name: true } } },
  })

  const map: Record<string, string> = {}
  for (const cat of categories) {
    for (const prod of cat.products) {
      map[prod.name] = cat.name
    }
  }
  return map
}
