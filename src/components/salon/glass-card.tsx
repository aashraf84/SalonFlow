'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { forwardRef, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'

// ─── Animated GlassCard ────────────────────────────────────────────────────

interface GlassCardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'elevated' | 'flat' | 'accent'
  glow?: boolean
  hover3d?: boolean
  animateOnMount?: boolean
  delay?: number
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant = 'default',
      glow = false,
      hover3d = true,
      animateOnMount = true,
      delay = 0,
      children,
      onMouseMove,
      ...props
    },
    ref
  ) => {
    const cardRef = useRef<HTMLDivElement>(null)

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!hover3d || !cardRef.current) return
        const rect = cardRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const rotateX = ((y - centerY) / centerY) * -3
        const rotateY = ((x - centerX) / centerX) * 3

        cardRef.current.style.setProperty('--mouse-x', `${x}px`)
        cardRef.current.style.setProperty('--mouse-y', `${y}px`)
        cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`

        onMouseMove?.(e)
      },
      [hover3d, onMouseMove]
    )

    const handleMouseLeave = useCallback(() => {
      if (!cardRef.current) return
      cardRef.current.style.transform =
        'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
    }, [])

    const variantStyles = {
      default:
        'glass-effect shadow-sm',
      elevated:
        'glass-effect shadow-lg shadow-black/[0.04] dark:shadow-black/20',
      flat:
        'bg-card/40 backdrop-blur-xl border border-border/50',
      accent:
        'bg-tahoe-accent-soft backdrop-blur-xl border border-tahoe-accent/20',
    }

    return (
      <motion.div
        ref={(node) => {
          // Handle both refs
          ;(cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        initial={
          animateOnMount
            ? { opacity: 0, y: 20, scale: 0.97 }
            : undefined
        }
        animate={
          animateOnMount
            ? { opacity: 1, y: 0, scale: 1 }
            : undefined
        }
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
          delay,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'rounded-2xl transition-all duration-300 ease-out',
          variantStyles[variant],
          glow && 'card-glow',
          hover3d && 'will-change-transform',
          className
        )}
        style={{
          transition: 'transform 0.15s ease-out, box-shadow 0.3s ease',
        }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
GlassCard.displayName = 'GlassCard'

// ─── Animated Metric Card ──────────────────────────────────────────────────

interface AnimatedMetricCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  accentGradient?: string
  iconBg?: string
  delay?: number
}

export function AnimatedMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentGradient = 'from-rose-500/20 to-pink-500/20',
  iconBg = 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  delay = 0,
}: AnimatedMetricCardProps) {
  return (
    <GlassCard
      variant="default"
      glow
      delay={delay}
      className="p-5 group"
    >
      {/* Top accent gradient bar */}
      <div className={cn('absolute top-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity', accentGradient)} />
      
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <motion.p
            className="text-2xl font-bold mt-1.5 tracking-tight truncate"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.15, type: 'spring', stiffness: 200 }}
          >
            {value}
          </motion.p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
          )}
        </div>
        <motion.div
          className={cn('flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ml-3', iconBg)}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <Icon className="w-5 h-5" />
        </motion.div>
      </div>
    </GlassCard>
  )
}

// ─── Animated AI Insight Card ──────────────────────────────────────────────

interface AnimatedInsightCardProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  insight: string
  metric: string
  delay?: number
}

export function AnimatedInsightCard({
  title,
  icon: Icon,
  iconBg,
  insight,
  metric,
  delay = 0,
}: AnimatedInsightCardProps) {
  return (
    <GlassCard
      variant="elevated"
      glow
      delay={delay}
      className="p-5 group"
    >
      <div className="flex items-start gap-3 relative z-10">
        <motion.div
          className={cn('flex items-center justify-center w-10 h-10 rounded-xl shrink-0', iconBg)}
          whileHover={{ scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-semibold">{title}</p>
            <motion.span
              className="text-xs font-mono font-bold text-tahoe-accent"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.3, type: 'spring', stiffness: 300 }}
            >
              {metric}
            </motion.span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {insight}
          </p>
        </div>
      </div>
    </GlassCard>
  )
}

// ─── Stagger Container ─────────────────────────────────────────────────────

interface StaggerContainerProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.05,
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Stagger Item ──────────────────────────────────────────────────────────

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16, scale: 0.97 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Animated Counter ──────────────────────────────────────────────────────

export function AnimatedCounter({
  value,
  duration = 1.5,
  className,
}: {
  value: number
  duration?: number
  className?: string
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {value.toLocaleString()}
      </motion.span>
    </motion.span>
  )
}

// ─── Pulse Indicator ───────────────────────────────────────────────────────

export function PulseIndicator({ color = 'bg-fuchsia-500' }: { color?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={cn(
          'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
          color
        )}
      />
      <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', color)} />
    </span>
  )
}

// ─── Re-exports for convenience ────────────────────────────────────────────

export { cn }
