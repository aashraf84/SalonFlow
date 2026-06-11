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

const aiInsights = [
  {
    title: 'Revenue Trend',
    value: '+14.2%',
    trend: 'up' as const,
    description: 'vs last month',
  },
  {
    title: 'Busiest Day',
    value: 'Saturday',
    trend: 'neutral' as const,
    description: '2pm - 5pm peak',
  },
  {
    title: 'Top Staff',
    value: 'A. Khan',
    trend: 'up' as const,
    description: '42 bookings this week',
  },
  {
    title: 'Hot Service',
    value: 'Keratin',
    trend: 'up' as const,
    description: '+28% this month',
  },
]

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
              {aiInsights.map((insight, idx) => (
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
