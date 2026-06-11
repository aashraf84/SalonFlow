'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  const cycleTheme = useCallback(() => {
    if (resolvedTheme === 'dark') setTheme('light')
    else setTheme('dark')
  }, [resolvedTheme, setTheme])

  return (
    <button
      onClick={cycleTheme}
      className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-foreground/[0.04] hover:bg-foreground/[0.06] transition-colors"
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      <AnimatePresence mode="wait" initial={false}>
        {resolvedTheme === 'dark' ? (
          <motion.div
            key="moon"
            initial={{ scale: 0, rotate: -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Moon className="size-[18px] text-indigo-300" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ scale: 0, rotate: -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Sun className="size-[18px] text-amber-500" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
