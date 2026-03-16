'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Tooltip that works on both desktop (hover) and mobile (tap).
 * On touch devices, Radix tooltips don't open — this wrapper
 * toggles open state on click so tapping works.
 */
function Tooltip({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) {
  const [open, setOpen] = React.useState(false);

  return (
    <TooltipPrimitive.Root
      open={open}
      onOpenChange={setOpen}
      {...props}
    >
      <div
        onClick={() => setOpen((prev) => !prev)}
        onPointerDown={(e) => {
          // Prevent default only on touch to avoid interfering with mouse hover
          if (e.pointerType === 'touch') {
            e.preventDefault();
          }
        }}
      >
        {children}
      </div>
    </TooltipPrimitive.Root>
  );
}

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
