/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // use a simpler, consistent palette for badges: primary (sky), secondary (slate), destructive (rose)
        default: "border-transparent bg-sky-600 text-white hover:bg-sky-500",
        secondary: "border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200",
        destructive: "border-transparent bg-rose-600 text-white hover:bg-rose-500",
        outline: "text-foreground border-muted bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
