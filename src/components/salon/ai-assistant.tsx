'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  Bot,
  Send,
  TrendingUp,
  Users,
  Heart,
  Star,
  Package,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  User,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface QuickAction {
  title: string
  description: string
  icon: React.ReactNode
  prompt: string
  color: string
}

interface AIInsight {
  title: string
  value: string
  trend: 'up' | 'down' | 'neutral'
  description: string
}

// ─── Dashboard API response types ──────────────────────────────────────────

interface DashboardData {
  todayStats: {
    appointmentsCount: number
    revenue: number
    completedAppointments: number
  }
  monthlyStats: {
    revenue: number
    appointmentsCount: number
    newCustomers: number
  }
  customerMetrics: {
    totalActive: number
    membershipRevenue: number
    totalLoyaltyPoints: number
    averageLifetimeValue: number
  }
  staffMetrics: {
    total: number
    byRole: Record<string, number>
  }
  appointmentTrends: Array<{
    date: string
    count: number
    revenue: number
  }>
  revenueByService: Array<{
    category: string
    revenue: number
  }>
  recentAppointments: Array<{
    id: string
    date: string
    startTime: string
    endTime: string
    status: string
    type: string
    totalAmount: number
    notes: string | null
    customer: {
      id: string
      firstName: string
      lastName: string
      phone: string
    } | null
    staff: {
      id: string
      firstName: string
      lastName: string
      role: string
    }
  }>
  topServices: Array<{
    serviceId: string
    name: string
    price: number
    duration: number
    category: string
    bookingCount: number
  }>
  branchPerformance: Array<{
    branchId: string
    branchName: string
    revenue: number
    appointmentsCount: number
  }>
  inventoryAlerts: Array<{
    id: string
    productName: string
    sku: string
    quantity: number
    reorderLevel: number
    branchName: string
  }>
  loyaltyTierBreakdown: Record<string, number>
  monthlyRevenueTrend: Array<{
    month: string
    revenue: number
  }>
}

const quickActions: QuickAction[] = [
  {
    title: 'Revenue Forecast',
    description: 'Predicted revenue trends for next quarter',
    icon: <TrendingUp className="h-5 w-5" />,
    prompt: 'What is my revenue forecast for the next quarter based on current trends?',
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950',
  },
  {
    title: 'Staff Optimization',
    description: 'Scheduling recommendations for efficiency',
    icon: <Users className="h-5 w-5" />,
    prompt: 'How can I optimize staff scheduling to reduce idle time and improve coverage?',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
  },
  {
    title: 'Customer Retention',
    description: 'At-risk customer analysis and actions',
    icon: <Heart className="h-5 w-5" />,
    prompt: 'Which customers are at risk of churning and what retention strategies should I use?',
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950',
  },
  {
    title: 'Service Popularity',
    description: 'Most profitable services analysis',
    icon: <Star className="h-5 w-5" />,
    prompt: 'What are my most profitable services and how can I maximize their revenue?',
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950',
  },
  {
    title: 'Inventory Suggestions',
    description: 'Reorder recommendations & alerts',
    icon: <Package className="h-5 w-5" />,
    prompt: 'What inventory items need to be reordered soon and what are the recommendations?',
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
  },
]

// ─── Helper: compute real insights from dashboard data ─────────────────────

function computeInsights(data: DashboardData): AIInsight[] {
  const insights: AIInsight[] = []

  // 1. Revenue Trend — compare current month vs previous month
  const revenueTrend = data.monthlyRevenueTrend
  if (revenueTrend.length >= 2) {
    const currentMonth = revenueTrend[revenueTrend.length - 1]
    const previousMonth = revenueTrend[revenueTrend.length - 2]
    const current = currentMonth.revenue
    const previous = previousMonth.revenue

    if (previous > 0) {
      const pctChange = ((current - previous) / previous) * 100
      const sign = pctChange >= 0 ? '+' : ''
      insights.push({
        title: 'Revenue Trend',
        value: `${sign}${pctChange.toFixed(1)}%`,
        trend: pctChange > 0 ? 'up' : pctChange < 0 ? 'down' : 'neutral',
        description: 'vs last month',
      })
    } else if (current > 0) {
      insights.push({
        title: 'Revenue Trend',
        value: `+${current.toFixed(0)}`,
        trend: 'up',
        description: 'new revenue this month',
      })
    } else {
      insights.push({
        title: 'Revenue Trend',
        value: '0%',
        trend: 'neutral',
        description: 'no revenue yet',
      })
    }
  } else if (revenueTrend.length === 1) {
    const current = revenueTrend[0].revenue
    insights.push({
      title: 'Revenue Trend',
      value: current > 0 ? `${current.toFixed(0)}` : '0',
      trend: current > 0 ? 'up' : 'neutral',
      description: 'first month data',
    })
  }

  // 2. Busiest Day — find the day with most appointments from trends
  const trends = data.appointmentTrends
  if (trends.length > 0 && trends.some((t) => t.count > 0)) {
    const busiest = trends.reduce((max, t) => (t.count > max.count ? t : max), trends[0])
    const dayName = new Date(busiest.date + 'T00:00:00Z').toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'UTC',
    })
    insights.push({
      title: 'Busiest Day',
      value: dayName,
      trend: 'neutral',
      description: `${busiest.count} appointment${busiest.count !== 1 ? 's' : ''}`,
    })
  } else {
    insights.push({
      title: 'Busiest Day',
      value: 'N/A',
      trend: 'neutral',
      description: 'no appointment data',
    })
  }

  // 3. Top Staff — staff with most appointments from recentAppointments
  const recentAppts = data.recentAppointments
  if (recentAppts.length > 0) {
    const staffCounts = new Map<string, { name: string; count: number }>()
    for (const appt of recentAppts) {
      const key = appt.staff.id
      const name = `${appt.staff.firstName} ${appt.staff.lastName}`
      const existing = staffCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        staffCounts.set(key, { name, count: 1 })
      }
    }
    const topStaffEntry = [...staffCounts.values()].sort((a, b) => b.count - a.count)[0]
    if (topStaffEntry) {
      insights.push({
        title: 'Top Staff',
        value: topStaffEntry.name,
        trend: 'up',
        description: `${topStaffEntry.count} booking${topStaffEntry.count !== 1 ? 's' : ''} recently`,
      })
    }
  } else {
    insights.push({
      title: 'Top Staff',
      value: 'N/A',
      trend: 'neutral',
      description: 'no booking data',
    })
  }

  // 4. Hot Service — most booked service from topServices
  const topServices = data.topServices
  if (topServices.length > 0) {
    const hotService = topServices[0]
    insights.push({
      title: 'Hot Service',
      value: hotService.name,
      trend: 'up',
      description: `${hotService.bookingCount} booking${hotService.bookingCount !== 1 ? 's' : ''} total`,
    })
  } else {
    insights.push({
      title: 'Hot Service',
      value: 'N/A',
      trend: 'neutral',
      description: 'no service data',
    })
  }

  return insights
}

export default function AIAssistantModule() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm your AI Business Assistant for SalonFlow OS. I can help you analyze your salon data, forecast trends, optimize operations, and more. Ask me anything about your business, or try one of the quick actions below!",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ─── AI Insights state ─────────────────────────────────────────────────
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [insightsEmpty, setInsightsEmpty] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchInsights() {
      setInsightsLoading(true)
      setInsightsEmpty(false)

      try {
        const res = await fetch('/api/dashboard')
        const json = await res.json()

        if (cancelled) return

        if (json.success && json.data) {
          const data = json.data as DashboardData
          const computed = computeInsights(data)

          // If every insight shows "N/A" or no revenue, treat as empty
          const hasData = computed.some(
            (i) => i.value !== 'N/A' && i.value !== '0' && i.value !== '0%',
          )

          if (hasData) {
            setAiInsights(computed)
            setInsightsEmpty(false)
          } else {
            setAiInsights([])
            setInsightsEmpty(true)
          }
        } else {
          setAiInsights([])
          setInsightsEmpty(true)
        }
      } catch {
        if (!cancelled) {
          setAiInsights([])
          setInsightsEmpty(true)
        }
      } finally {
        if (!cancelled) {
          setInsightsLoading(false)
        }
      }
    }

    fetchInsights()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      })

      const json = await res.json()

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: json.success
          ? json.data?.response || json.data?.message || "I analyzed your request but couldn't generate a specific response. Please try rephrasing your question."
          : 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          "I'm having trouble connecting right now. Please check your connection and try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Business Assistant</h1>
          <p className="text-muted-foreground text-sm">
            Intelligent insights and recommendations for your salon
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Chat Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => handleQuickAction(action)}
                className="flex flex-col items-center gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors text-center group"
                disabled={isLoading}
              >
                <div className={`p-2 rounded-lg ${action.color}`}>
                  {action.icon}
                </div>
                <div>
                  <p className="text-xs font-medium group-hover:text-primary transition-colors">
                    {action.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {action.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Chat Interface */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Chat with AI Assistant</CardTitle>
                {isLoading && (
                  <Badge variant="secondary" className="text-xs animate-pulse">
                    Thinking...
                  </Badge>
                )}
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              {/* Messages Area */}
              <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                        <p
                          className={`text-[10px] mt-1 ${
                            message.role === 'user'
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {message.role === 'user' && (
                        <div className="shrink-0 h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                          <User className="h-4 w-4 text-secondary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg px-4 py-3">
                        <div className="flex gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <Separator />

              {/* Input Area */}
              <form onSubmit={handleSubmit} className="p-4 flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your salon business..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm">AI Insights</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Auto-generated business intelligence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Loading skeleton */}
              {insightsLoading &&
                Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50"
                  >
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                ))}

              {/* No data state */}
              {!insightsLoading && insightsEmpty && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Lightbulb className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No data yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Insights will appear as your salon data grows
                  </p>
                </div>
              )}

              {/* Real insights */}
              {!insightsLoading &&
                !insightsEmpty &&
                aiInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">{insight.title}</p>
                      <p className="text-sm font-semibold">{insight.value}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {insight.description}
                      </p>
                    </div>
                    {insight.trend === 'up' ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    ) : insight.trend === 'down' ? (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Suggested Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                'What are my busiest hours?',
                'How is my customer retention rate?',
                'Which services should I promote?',
                'Compare branch performance',
                'What inventory needs reordering?',
              ].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(q)}
                  disabled={isLoading}
                  className="w-full text-left text-xs p-2 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
