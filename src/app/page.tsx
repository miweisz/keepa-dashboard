import Link from "next/link";
import { ShoppingCart } from "lucide-react";

const DASHBOARDS = [
  {
    href: "/dashboard",
    label: "Amazon Tracker",
    description: "Suivi des prix, buybox, content et ASINs sur les marketplaces Amazon EU",
    icon: ShoppingCart,
    color: "from-orange-500 to-amber-500",
  },
];

export default function HomePage() {
  return (
    <div className="container mx-auto py-16 px-6 max-w-[1000px]">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          Shapeheart Back Office
        </h1>
        <p className="text-lg text-muted-foreground">
          Sélectionnez un dashboard pour commencer
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {DASHBOARDS.map((dash) => (
          <Link
            key={dash.href}
            href={dash.href}
            className="group relative flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-white p-8 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-200"
          >
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${dash.color} text-white shadow-md group-hover:scale-110 transition-transform duration-200`}
            >
              <dash.icon className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-1">{dash.label}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {dash.description}
              </p>
            </div>
          </Link>
        ))}

        {/* Placeholder for future dashboards */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/40 p-8 text-muted-foreground/50">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-current">
            <span className="text-3xl font-light">+</span>
          </div>
          <p className="text-sm font-medium">Bientôt disponible</p>
        </div>
      </div>
    </div>
  );
}
