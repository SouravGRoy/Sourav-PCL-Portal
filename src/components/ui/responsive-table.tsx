"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveTableRowProps {
  children: React.ReactNode;
  className?: string;
  mobileView?: React.ReactNode;
}

interface ResponsiveTableCellProps {
  children: React.ReactNode;
  className?: string;
  label?: string;
  hideOnMobile?: boolean;
}

const ResponsiveTable = React.forwardRef<
  HTMLTableElement,
  ResponsiveTableProps
>(({ className, children, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm hidden md:table", className)}
      {...props}
    >
      {children}
    </table>
  </div>
));
ResponsiveTable.displayName = "ResponsiveTable";

const ResponsiveTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
ResponsiveTableHeader.displayName = "ResponsiveTableHeader";

const ResponsiveTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
ResponsiveTableBody.displayName = "ResponsiveTableBody";

const ResponsiveTableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
ResponsiveTableFooter.displayName = "ResponsiveTableFooter";

const ResponsiveTableRow = React.forwardRef<
  HTMLTableRowElement,
  ResponsiveTableRowProps
>(({ className, children, mobileView, ...props }, ref) => (
  <>
    {/* Desktop table row */}
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted hidden md:table-row",
        className
      )}
      {...props}
    >
      {children}
    </tr>

    {/* Mobile card view */}
    {mobileView && (
      <div className="md:hidden mb-3">
        <Card>
          <CardContent className="p-4">{mobileView}</CardContent>
        </Card>
      </div>
    )}
  </>
));
ResponsiveTableRow.displayName = "ResponsiveTableRow";

const ResponsiveTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
ResponsiveTableHead.displayName = "ResponsiveTableHead";

const ResponsiveTableCell = React.forwardRef<
  HTMLTableCellElement,
  ResponsiveTableCellProps
>(({ className, children, label, hideOnMobile, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-4 align-middle [&:has([role=checkbox])]:pr-0",
      hideOnMobile && "hidden md:table-cell",
      className
    )}
    {...props}
  >
    {children}
  </td>
));
ResponsiveTableCell.displayName = "ResponsiveTableCell";

const ResponsiveTableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
ResponsiveTableCaption.displayName = "ResponsiveTableCaption";

export {
  ResponsiveTable,
  ResponsiveTableHeader,
  ResponsiveTableBody,
  ResponsiveTableFooter,
  ResponsiveTableHead,
  ResponsiveTableRow,
  ResponsiveTableCell,
  ResponsiveTableCaption,
};
