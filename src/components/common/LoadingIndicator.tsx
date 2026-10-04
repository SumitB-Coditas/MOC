import { cva, type VariantProps } from 'class-variance-authority'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

const containerVariants = cva('flex items-center justify-center gap-2 text-muted-foreground', {
  variants: {
    layout: {
      inline: 'inline-flex',
      block: 'w-full py-10',
      fullPage: 'min-h-svh w-full',
    },
  },
  defaultVariants: { layout: 'inline' },
})

const spinnerVariants = cva('', {
  variants: {
    size: { sm: 'size-4', md: 'size-6', lg: 'size-8' },
  },
  defaultVariants: { size: 'md' },
})

interface LoadingIndicatorProps
  extends VariantProps<typeof containerVariants>, VariantProps<typeof spinnerVariants> {
  /** Announced to screen readers; shown visually unless `hideLabel` is set. */
  label?: string
  hideLabel?: boolean
  className?: string
}

export function LoadingIndicator({
  label = 'Loading…',
  hideLabel = false,
  layout,
  size,
  className,
}: LoadingIndicatorProps) {
  return (
    <div role="status" aria-live="polite" className={cn(containerVariants({ layout }), className)}>
      {/* The wrapper owns the status role, so the icon is decorative. */}
      <Spinner role="presentation" aria-hidden="true" className={spinnerVariants({ size })} />
      <span className={cn('text-sm', hideLabel && 'sr-only')}>{label}</span>
    </div>
  )
}
