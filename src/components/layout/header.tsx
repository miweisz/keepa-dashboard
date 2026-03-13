"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Package, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/asins",
    label: "ASINs à suivre",
    icon: Package,
  },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border/60 shadow-sm">
      <div className="container mx-auto flex h-14 items-center px-6 gap-8">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 shrink-0 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-white shadow-sm">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-[13px] font-semibold leading-none text-foreground tracking-tight">
              Shapeheart
            </h1>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
              Amazon Tracker
            </p>
          </div>
        </Link>

        {/* Separator */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
