"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Package, ShoppingCart, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const TRACKER_NAV = [
  {
    href: "/dashboard",
    label: "Buybox",
    icon: ShoppingCart,
  },
  {
    href: "/content",
    label: "Content",
    icon: FileText,
  },
  {
    href: "/asins",
    label: "Config ASINs",
    icon: Package,
  },
];

export function Header() {
  const pathname = usePathname();

  // Show tracker nav when on any tracker page
  const isTrackerSection =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/asins") ||
    pathname.startsWith("/content");

  // On home page, logo links to tech.shapeheart.fr; in tracker section, logo links to /amazon-tracker
  const logoHref = isTrackerSection ? "/" : undefined;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border/60 shadow-sm">
      <div className="container mx-auto flex h-14 items-center px-6 gap-8">
        {/* Logo */}
        {logoHref ? (
          <Link href={logoHref} className="flex items-center gap-3 shrink-0 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-white shadow-sm">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-[13px] font-semibold leading-none text-foreground tracking-tight">
                Shapeheart
              </h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                Back Office
              </p>
            </div>
          </Link>
        ) : (
          <a href="https://tech.shapeheart.fr" className="flex items-center gap-3 shrink-0 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-white shadow-sm">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-[13px] font-semibold leading-none text-foreground tracking-tight">
                Shapeheart
              </h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                Back Office
              </p>
            </div>
          </a>
        )}

        {/* Show tracker nav only in tracker section */}
        {isTrackerSection && (
          <>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <nav className="flex items-center gap-1">
              {TRACKER_NAV.map((item) => {
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
          </>
        )}
      </div>
    </header>
  );
}
