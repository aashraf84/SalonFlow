'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, MessageSquare, ThumbsUp, AlertTriangle, Eye, EyeOff,
  Flag, Reply, Filter, Loader2, BarChart3, Users,
} from 'lucide-react'
import {
  GlassCard,
  AnimatedMetricCard,
  StaggerContainer,
  StaggerItem,
} from '@/components/salon/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

type FeedbackStatus = 'published' | 'hidden' | 'flagged'

interface Review {
  id: string
  customerId: string
  customerName: string
  rating: number
  comment: string
  tags: string[]
  status: FeedbackStatus
  salonResponse: string | null
  createdAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function getStatusBadge(status: FeedbackStatus): { label: string; className: string } {
  switch (status) {
    case 'published':
      return { label: 'Published', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' }
    case 'hidden':
      return { label: 'Hidden', className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-700' }
    case 'flagged':
      return { label: 'Flagged', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' }
  }
}

// ─── Star Display Component ──────────────────────────────────────────────────

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4.5 h-4.5' : 'w-6 h-6'
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClass,
            i < rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function FeedbackSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassCard key={i} variant="default" className="p-5" animateOnMount={false}>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20 rounded-lg" />
                <Skeleton className="h-7 w-28 rounded-lg" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl" />
            </div>
          </GlassCard>
        ))}
      </div>
      <GlassCard variant="default" className="p-6" animateOnMount={false}>
        <Skeleton className="h-5 w-40 rounded-lg mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-6 rounded" />
              <div className="flex-1 h-2 rounded-full bg-muted/50">
                <Skeleton className="h-full rounded-full" style={{ width: `${Math.random() * 100}%` }} />
              </div>
              <Skeleton className="h-4 w-8 rounded" />
            </div>
          ))}
        </div>
      </GlassCard>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <GlassCard key={i} variant="default" className="p-5" animateOnMount={false}>
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function FeedbackModule() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ratingFilter, setRatingFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Respond dialog
  const [showRespondDialog, setShowRespondDialog] = useState(false)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [responseText, setResponseText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (ratingFilter !== 'all') params.set('rating', ratingFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/feedback?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setReviews(data.data)
      } else {
        setError(data.error || 'Failed to fetch reviews')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [ratingFilter, statusFilter])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  // ─── Computed ───────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalReviews = reviews.length
    const avgRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0
    const fiveStarCount = reviews.filter(r => r.rating === 5).length
    const respondedCount = reviews.filter(r => r.salonResponse).length
    const responseRate = totalReviews > 0 ? Math.round((respondedCount / totalReviews) * 100) : 0
    return { avgRating: avgRating.toFixed(1), totalReviews, fiveStarCount, responseRate }
  }, [reviews])

  const ratingDistribution = useMemo(() => {
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach(r => { dist[r.rating] = (dist[r.rating] || 0) + 1 })
    return dist
  }, [reviews])

  const maxRatingCount = useMemo(() => {
    return Math.max(...Object.values(ratingDistribution), 1)
  }, [ratingDistribution])

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleRespond = async () => {
    if (!selectedReview || !responseText.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/feedback/${selectedReview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonResponse: responseText.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Response submitted successfully')
        setReviews(prev => prev.map(r =>
          r.id === selectedReview.id ? { ...r, salonResponse: responseText.trim() } : r
        ))
        setShowRespondDialog(false)
        setResponseText('')
        setSelectedReview(null)
      } else {
        toast.error(data.error || 'Failed to submit response')
      }
    } catch {
      toast.error('Failed to submit response')
    } finally {
      setSubmitting(false)
    }
  }

  const handleModerate = async (id: string, action: 'hide' | 'flag' | 'publish') => {
    try {
      const statusMap = { hide: 'hidden' as FeedbackStatus, flag: 'flagged' as FeedbackStatus, publish: 'published' as FeedbackStatus }
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusMap[action] }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Review ${action === 'hide' ? 'hidden' : action === 'flag' ? 'flagged' : 'published'}`)
        setReviews(prev => prev.map(r =>
          r.id === id ? { ...r, status: statusMap[action] } : r
        ))
      }
    } catch {
      toast.error('Failed to update review status')
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading && reviews.length === 0) return <FeedbackSkeleton />

  if (error) {
    return (
      <GlassCard variant="elevated" className="p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <AlertTriangle className="w-10 h-10 mx-auto text-destructive mb-4" />
        </motion.div>
        <p className="text-sm font-medium text-destructive">Failed to load reviews</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchReviews}>
          Retry
        </Button>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10">
          <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Customer Feedback</h2>
          <p className="text-sm text-muted-foreground">Reviews, ratings, and moderation</p>
        </div>
      </motion.div>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" staggerDelay={0.06}>
        <StaggerItem>
          <AnimatedMetricCard
            title="Average Rating"
            value={stats.avgRating}
            subtitle="Out of 5.0"
            icon={Star}
            accentGradient="from-amber-500/30 to-yellow-500/30"
            iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Total Reviews"
            value={stats.totalReviews.toString()}
            subtitle="All time"
            icon={MessageSquare}
            accentGradient="from-rose-500/30 to-pink-500/30"
            iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="5-Star Count"
            value={stats.fiveStarCount.toString()}
            subtitle="Excellent reviews"
            icon={ThumbsUp}
            accentGradient="from-emerald-500/30 to-green-500/30"
            iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
        </StaggerItem>
        <StaggerItem>
          <AnimatedMetricCard
            title="Response Rate"
            value={`${stats.responseRate}%`}
            subtitle="Reviews responded to"
            icon={Reply}
            accentGradient="from-pink-500/30 to-rose-500/30"
            iconBg="bg-pink-500/10 text-pink-600 dark:text-pink-400"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Rating Distribution */}
      <GlassCard variant="default" glow delay={0.3} className="p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10">
              <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold">Rating Distribution</h3>
              <p className="text-[11px] text-muted-foreground">How customers are rating your salon</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((star, i) => {
            const count = ratingDistribution[star] || 0
            const percentage = maxRatingCount > 0 ? Math.round((count / maxRatingCount) * 100) : 0
            return (
              <motion.div
                key={star}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.06, type: 'spring', stiffness: 200 }}
                className="flex items-center gap-3"
              >
                <div className="flex items-center gap-1 w-14 shrink-0">
                  <span className="text-sm font-semibold">{star}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </div>
                <div className="flex-1 h-2.5 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: 0.6 + i * 0.08, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{count}</span>
              </motion.div>
            )
          })}
        </div>
      </GlassCard>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Reviews List */}
      <div className="space-y-3">
        <AnimatePresence>
          {reviews.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <GlassCard variant="default" className="p-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-medium mb-1">No reviews found</h3>
                <p className="text-sm text-muted-foreground">
                  {ratingFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No customer reviews yet'}
                </p>
              </GlassCard>
            </motion.div>
          ) : (
            reviews.map((review, i) => {
              const statusBadge = getStatusBadge(review.status)
              return (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 200 }}
                >
                  <GlassCard
                    variant="default"
                    className="p-5 group"
                    animateOnMount={false}
                    hover3d={false}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-white text-sm font-bold shrink-0">
                        {review.customerName.charAt(0).toUpperCase()}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p className="text-sm font-semibold">{review.customerName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <StarDisplay rating={review.rating} />
                              <span className="text-[11px] text-muted-foreground">{formatDate(review.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge className={cn('text-[10px] rounded-lg border', statusBadge.className)}>
                              {statusBadge.label}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{review.comment}</p>

                        {/* Tags */}
                        {review.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {review.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 rounded-md border-border/50"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Salon Response */}
                        {review.salonResponse && (
                          <div className="mt-3 p-3 rounded-xl bg-tahoe-accent/5 border border-tahoe-accent/10">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-tahoe-accent mb-1">Salon Response</p>
                            <p className="text-xs text-foreground/80 leading-relaxed">{review.salonResponse}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          {!review.salonResponse && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] gap-1 text-tahoe-accent hover:bg-tahoe-accent/10"
                              onClick={() => {
                                setSelectedReview(review)
                                setResponseText('')
                                setShowRespondDialog(true)
                              }}
                            >
                              <Reply className="h-3.5 w-3.5" />
                              Respond
                            </Button>
                          )}
                          {review.status === 'published' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] gap-1 text-muted-foreground hover:bg-foreground/5"
                              onClick={() => handleModerate(review.id, 'hide')}
                            >
                              <EyeOff className="h-3.5 w-3.5" />
                              Hide
                            </Button>
                          )}
                          {review.status !== 'flagged' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] gap-1 text-amber-500 hover:bg-amber-500/10"
                              onClick={() => handleModerate(review.id, 'flag')}
                            >
                              <Flag className="h-3.5 w-3.5" />
                              Flag
                            </Button>
                          )}
                          {review.status !== 'published' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] gap-1 text-emerald-500 hover:bg-emerald-500/10"
                              onClick={() => handleModerate(review.id, 'publish')}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Publish
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>

      {/* Respond Dialog */}
      <Dialog open={showRespondDialog} onOpenChange={setShowRespondDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="h-5 w-5 text-tahoe-accent" />
              Respond to Review
            </DialogTitle>
            <DialogDescription>
              {selectedReview?.customerName} — {selectedReview?.rating} star{selectedReview?.rating !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <StarDisplay rating={selectedReview.rating} />
                </div>
                <p className="text-sm text-muted-foreground">{selectedReview.comment}</p>
              </div>
              <div className="grid gap-2">
                <Label>Your Response</Label>
                <Textarea
                  placeholder="Write a thoughtful response..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRespondDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-tahoe-accent hover:bg-tahoe-accent/90"
              onClick={handleRespond}
              disabled={submitting || !responseText.trim()}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
