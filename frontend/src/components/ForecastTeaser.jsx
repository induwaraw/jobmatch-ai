import { useEffect, useState } from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { api } from "../lib/api";
import Button from "./ui/Button";
import Card from "./ui/Card";

const TRENDS = {
  rising: { icon: TrendingUp, text: "text-brand", bar: "bg-brand" },
  stable: { icon: Minus, text: "text-muted", bar: "bg-muted" },
  cooling: { icon: TrendingDown, text: "text-accent", bar: "bg-accent" },
};

function trendKey(row) {
  if (row?.trend === "rising") return "rising";
  if (row?.trend === "declining") return "cooling";
  return "stable";
}

export default function ForecastTeaser() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/forecasts")
      .then(({ data }) => {
        if (cancelled) return;
        const mapped = data.subcategories
          .map((entry) => {
            const row = entry.horizons.find((h) => h.horizon_months === 12);
            return {
              name: entry.subcategory,
              change: row?.pct_change ?? 0,
              key: trendKey(row),
            };
          })
          .sort((a, b) => b.change - a.change);
        setRows(mapped);
      })
      .catch(() => setRows([]));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!rows || rows.length === 0) return null;

  const peak = Math.max(...rows.map((r) => Math.abs(r.change)), 0.5);

  return (
    <Card className="p-6 sm:p-7">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">
        Demand forecast
      </p>
      <h3 className="mt-3 font-display text-[1.3rem] font-semibold leading-snug text-ink">
        Projected change over the next 12 months
      </h3>

      <ul className="mt-6 space-y-3.5">
        {rows.map((row) => {
          const style = TRENDS[row.key];
          const Icon = style.icon;
          const width = `${(Math.abs(row.change) / peak) * 100}%`;
          return (
            <li key={row.name}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="inline-flex items-center gap-1.5 text-sm text-ink">
                  <Icon
                    size={14}
                    strokeWidth={2.25}
                    aria-hidden="true"
                    className={style.text}
                  />
                  {row.name}
                </span>
                <span className={`text-sm font-medium ${style.text}`}>
                  {row.change > 0 ? "+" : ""}
                  {row.change.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full ${style.bar} transition-[width] duration-700 ease-out`}
                  style={{ width }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-7">
        <Button to="/forecast" variant="secondary" size="sm">
          See the full forecast
        </Button>
      </div>
    </Card>
  );
}
