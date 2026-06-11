'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Megaphone,
  Plus,
  Send,
  Mail,
  MessageSquare,
  Share2,
  Users,
  Eye,
  MousePointerClick,
  Calendar,
  Copy,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Campaign {
  id: string
  name: string
  type: string
  channel: string
  subject: string | null
  content: string
  targetAudience: string | null
  status: string
  scheduledAt: string | null
  sentAt: string | null
  recipientCount: number
  openRate: number
  clickRate: number
  createdAt: string
  branch: { id: string; name: string; branchCode: string } | null
}

interface CampaignStats {
  activeCampaigns: number
  totalRecipients: number
  avgOpenRate: number
  avgClickRate: number
}

const STATUS_STYLES: Record<string, { variant: 'secondary' | 'default' | 'outline' | 'destructive'; className: string }> = {
  draft: { variant: 'secondary', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  scheduled: { variant: 'outline', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
  sent: { variant: 'outline', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
  completed: { variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4 text-green-600" />,
  social: <Share2 className="h-4 w-4" />,
}

const TARGET_LABELS: Record<string, string> = {
  all: 'All Customers',
  members: 'Members Only',
  new_customers: 'New Customers',
  inactive: 'Inactive Customers',
  birthday_month: 'Birthday Month',
}

export default function MarketingModule() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    type: 'email',
    channel: 'email',
    content: '',
    targetAudience: 'all',
    scheduledAt: '',
    branchId: '',
  })

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/marketing')
      const json = await res.json()
      if (json.success) {
        setCampaigns(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const stats: CampaignStats = {
    activeCampaigns: campaigns.filter(
      (c) => c.status === 'scheduled' || c.status === 'sent'
    ).length,
    totalRecipients: campaigns.reduce((s, c) => s + c.recipientCount, 0),
    avgOpenRate:
      campaigns.length > 0
        ? campaigns.reduce((s, c) => s + c.openRate, 0) / campaigns.length
        : 0,
    avgClickRate:
      campaigns.length > 0
        ? campaigns.reduce((s, c) => s + c.clickRate, 0) / campaigns.length
        : 0,
  }

  const handleCreateCampaign = async () => {
    if (!form.name || !form.content) return
    setCreating(true)
    try {
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          branchId: form.branchId || undefined,
          scheduledAt: form.scheduledAt || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setCampaigns((prev) => [json.data, ...prev])
        setDialogOpen(false)
        setForm({
          name: '',
          type: 'email',
          channel: 'email',
          content: '',
          targetAudience: 'all',
          scheduledAt: '',
          branchId: '',
        })
        toast.success('Campaign created successfully')
      } else {
        toast.error(json.error || 'Failed to create campaign')
      }
    } catch (err) {
      console.error('Failed to create campaign:', err)
      toast.error('Failed to create campaign')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading campaigns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketing & Campaigns</h1>
          <p className="text-muted-foreground text-sm">
            Create and manage marketing campaigns across channels
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Set up a new marketing campaign for your customers
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Summer Sale 2024"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v, channel: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Channel</Label>
                  <Select
                    value={form.channel}
                    onValueChange={(v) => setForm({ ...form, channel: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="push">Push Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Target Audience</Label>
                <Select
                  value={form.targetAudience}
                  onValueChange={(v) => setForm({ ...form, targetAudience: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="members">Members Only</SelectItem>
                    <SelectItem value="new_customers">New Customers</SelectItem>
                    <SelectItem value="inactive">Inactive Customers</SelectItem>
                    <SelectItem value="birthday_month">Birthday Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Content</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Write your campaign message here..."
                  rows={4}
                />
              </div>
              <div className="grid gap-2">
                <Label>Schedule Date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign} disabled={creating || !form.name || !form.content}>
                {creating ? 'Creating...' : 'Create Campaign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Campaigns
            </CardTitle>
            <Megaphone className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Recipients
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRecipients.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Open Rate
            </CardTitle>
            <Eye className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgOpenRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Click Rate
            </CardTitle>
            <MousePointerClick className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgClickRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
          <CardDescription>Manage your marketing campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] overflow-y-auto space-y-4">
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 rounded-md bg-muted">
                        {CHANNEL_ICONS[campaign.channel] || <Send className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{campaign.name}</h3>
                          <Badge
                            variant={STATUS_STYLES[campaign.status]?.variant || 'secondary'}
                            className={`text-xs ${STATUS_STYLES[campaign.status]?.className || ''}`}
                          >
                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="capitalize">{campaign.type}</span>
                          <span>•</span>
                          <span className="capitalize">{campaign.channel}</span>
                          {campaign.targetAudience && (
                            <>
                              <span>•</span>
                              <span>{TARGET_LABELS[campaign.targetAudience] || campaign.targetAudience}</span>
                            </>
                          )}
                        </div>
                        {campaign.branch && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Branch: {campaign.branch.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Recipients</p>
                        <p className="font-semibold">{campaign.recipientCount}</p>
                      </div>
                    </div>
                  </div>

                  {/* Open/Click Rates */}
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Open Rate</span>
                        <span className="font-medium">{campaign.openRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={campaign.openRate} className="h-1.5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Click Rate</span>
                        <span className="font-medium">{campaign.clickRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={campaign.clickRate} className="h-1.5" />
                    </div>
                  </div>

                  {/* Date info */}
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {campaign.sentAt ? (
                      <span>Sent: {new Date(campaign.sentAt).toLocaleDateString()}</span>
                    ) : campaign.scheduledAt ? (
                      <span>Scheduled: {new Date(campaign.scheduledAt).toLocaleDateString()}</span>
                    ) : (
                      <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={async () => {
                          setSendingId(campaign.id)
                          try {
                            const res = await fetch(`/api/marketing/${campaign.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'sent' }),
                            })
                            const json = await res.json()
                            if (json.success) {
                              toast.success(`Campaign "${campaign.name}" sent`)
                              fetchCampaigns()
                            } else {
                              toast.error(json.error || 'Failed to send campaign')
                            }
                          } catch {
                            toast.error('Failed to send campaign')
                          } finally {
                            setSendingId(null)
                          }
                        }}
                        disabled={sendingId === campaign.id}
                      >
                        {sendingId === campaign.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Send
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={async () => {
                        setDuplicatingId(campaign.id)
                        try {
                          const res = await fetch('/api/marketing', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              branchId: campaign.branch?.id,
                              name: `${campaign.name} (Copy)`,
                              type: campaign.type,
                              channel: campaign.channel,
                              content: campaign.content,
                              targetAudience: campaign.targetAudience,
                            }),
                          })
                          const json = await res.json()
                          if (json.success) {
                            toast.success('Campaign duplicated')
                            fetchCampaigns()
                          } else {
                            toast.error(json.error || 'Failed to duplicate campaign')
                          }
                        } catch {
                          toast.error('Failed to duplicate campaign')
                        } finally {
                          setDuplicatingId(null)
                        }
                      }}
                      disabled={duplicatingId === campaign.id}
                    >
                      {duplicatingId === campaign.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />}
                      Duplicate
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Megaphone className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <h3 className="font-semibold text-sm">No campaigns yet</h3>
                <p className="text-muted-foreground text-xs mt-1">
                  Create your first campaign to reach your customers
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Campaign
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
