"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react@0.487.0";
import { DayPicker } from "react-day-picker@8.10.1";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-full max-w-[20rem] p-3", className)}
      classNames={{
        months: "flex flex-col gap-3",
        month: "flex flex-col gap-3",
        caption: "relative flex h-10 w-full items-center justify-center px-10",
        caption_label: "text-sm font-semibold text-gray-900",
        nav: "flex items-center gap-2",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-8 rounded-md border-gray-200 bg-white p-0 text-gray-600 shadow-sm opacity-100 hover:bg-gray-50 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-40",
        ),
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse",
        head_row: "flex gap-1",
        head_cell:
          "flex-1 rounded-md py-1 text-center text-xs font-medium text-gray-500",
        row: "mt-1 flex w-full gap-1",
        cell: cn(
          "relative flex size-9 flex-1 items-center justify-center p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:rounded-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 rounded-md p-0 text-sm font-medium text-gray-700 aria-selected:opacity-100 hover:bg-gray-100 hover:text-gray-950 focus-visible:ring-2 focus-visible:ring-blue-500",
        ),
        day_range_start:
          "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_range_end:
          "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_selected:
          "bg-gray-900 text-white shadow-sm hover:bg-gray-900 hover:text-white focus:bg-gray-900 focus:text-white",
        day_today: "bg-blue-50 text-blue-700 font-semibold",
        day_outside:
          "day-outside text-gray-300 aria-selected:text-gray-300",
        day_disabled: "text-gray-300 opacity-50 hover:bg-transparent hover:text-gray-300",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
