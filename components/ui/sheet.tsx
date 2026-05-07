"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { X } from "lucide-react"

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close
const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={className || `fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0`}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

/**
 * SheetContent now ALWAYS portals to document.body via <SheetPortal>.
 * This is critical for nested Sheet scenarios (e.g. Facility List → Patient Detail)
 * where Radix would otherwise trap focus and dismiss-on-outside-click incorrectly.
 */
const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
    /** Set to true to skip rendering the default overlay (for nested sheets that provide their own) */
    hideOverlay?: boolean;
    /** Set to true to hide the built-in close button (use custom close button instead) */
    hideCloseButton?: boolean;
  }
>(({ className, children, hideOverlay, hideCloseButton, ...props }, ref) => (
  <SheetPortal>
    {!hideOverlay && (
      <SheetOverlay />
    )}
    <SheetPrimitive.Content
      ref={ref}
      className={`fixed gap-4 bg-white p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm z-50 ${className || ''}`}
      {...props}
    >
      <VisuallyHidden.Root>
        <SheetPrimitive.Title>Patient List</SheetPrimitive.Title>
        <SheetPrimitive.Description>View and manage patient records</SheetPrimitive.Description>
      </VisuallyHidden.Root>
      {children}
      {!hideCloseButton && (
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-xl w-9 h-9 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 hover:bg-red-500/90 hover:border-red-400 text-slate-700 hover:text-white shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 z-50 group">
          <X className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" strokeWidth={2.5} />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      )}
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex flex-col space-y-2 text-center sm:text-left ${className || ''}`}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={`text-lg font-semibold text-slate-950 ${className || ''}`}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
}
