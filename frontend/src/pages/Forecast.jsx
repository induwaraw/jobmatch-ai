import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpDown,
  ChevronDown,
  Info,
  Minus,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Container from "../components/ui/Container";
import { colors } from "../design/tokens";
import { api, errorMessage } from "../lib/api";

const HORIZONS = [6, 12];

/**
 * The three states a user actually cares about. The API says rising, stable or
 * declining, and "cooling" is the friendlier word for the last one.
 */
const TRENDS = {
  rising: { label: "Rising", icon: TrendingUp, text: "text-brand", chart: colors.brand },
  stable: { label: "Stable", icon: Minus, text: "text-muted", chart: colors.muted },
  cooling: { label: "Cooling", icon: TrendingDown, text: "text-accent", chart: colors.accent },
};

const FILTERS = [
  { key: "all", label: "All areas" },
  { key: "rising", label: "Rising" },
  { key: "stable", label: "Stable" },
  { key: "cooling", label: "Cooling" },
];

const SORTS = {
  change: "Biggest growth first",
  name: "Alphabetical",
};

function trendKey(horizonRow) {
  if (!horizonRow) return "stable";
  if (horizonRow.trend === "rising") return "rising";
  if (horizonRow.trend === "declining") return "cooling";
  return "stable";
}

/** Turn a percentage into a word a person would use. */
function magnitude(pct) {
  const size = Math.abs(pct ?? 0);
  if (size < 0.5) return "barely";
  if (size < 2) return "slightly";
  if (size < 5) return "noticeably";
  return "sharply";
}

/** The plain English sentence under each area. */
function takeaway(name, horizonRow, months) {
  const pct = horizonRow?.pct_change ?? 0;
  const key = trendKey(horizonRow);
  const window = `over the next ${months} months`;

  if (key === "stable" && Math.abs(pct) < 0.5) {
    return `${name} demand is holding steady ${window}.`;
  }
  if (key === "rising") {
    return `${name} demand is picking up ${magnitude(pct)}, up ${Math.abs(pct).toFixed(1)}% ${window}.`;
  }
  if (key === "cooling") {
    return `${name} demand is easing ${magnitude(pct)}, down ${Math.abs(pct).toFixed(1)}% ${window}.`;
  }
  const direction = pct >= 0 ? "up" : "down";
  return `${name} demand is broadly flat, ${direction} ${Math.abs(pct).toFixed(1)}% ${window}.`;
}

function formatPct(value) {
  if (value == null) return "n/a";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function TrendBadge({ trend }) {
  const style = TRENDS[trend];
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${style.text}`}>
      <Icon size={16} strokeWidth={2.25} aria-hidden="true" />
      {style.label}
    </span>
  );
}

function AreaCard({ entry, months, selected, onToggleCompare }) {
  const byHorizon = Object.fromEntries(entry.horizons.map((h) => [h.horizon_months, h]));
  const row = byHorizon[months];
  const key = trendKey(row);
  const style = TRENDS[key];

  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-[1.15rem] font-semibold leading-snug text-ink">
          {entry.subcategory}
        </h3>
        <TrendBadge trend={key} />
      </div>

      {/* The number that leads is the change, not the index */}
      <p className={`mt-4 font-display text-[2.25rem] font-semibold leading-none ${style.text}`}>
        {formatPct(row?.pct_change)}
      </p>
      <p className="mt-1.5 text-sm text-muted">projected over {months} months</p>

      <p className="mt-4 text-[0.95rem] leading-relaxed text-ink">
        {takeaway(entry.subcategory, row, months)}
      </p>

      {/* Raw index values, small and clearly secondary */}
      <p
        className="mt-4 border-t border-line pt-4 text-sm text-muted"
        title="Index relative to a 2015 baseline, higher means more demand"
      >
        Index {entry.current_demand?.toFixed(1)} now to{" "}
        {row?.predicted_demand?.toFixed(1)} projected
      </p>

      <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleCompare(entry.subcategory)}
          className="h-4 w-4 rounded border-line accent-[#0F3D3E]"
        />
        Compare
      </label>
    </Card>
  );
}

/** Label drawn at the open end of each bar, flipping side for negatives. */
function ValueLabel({ x, y, width, height, value }) {
  const negative = value < 0;
  const tx = negative ? x - 8 : x + width + 8;
  return (
    <text
      x={tx}
      y={y + height / 2}
      dy={4}
      textAnchor={negative ? "end" : "start"}
      fontSize={12}
      fill={colors.ink}
    >
      {formatPct(value)}
    </text>
  );
}

export default function Forecast() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [months, setMonths] = useState(12);
  const [filter, setFilter] = useState("all");
  const [sortKey, setSortKey] = useState("change");
  const [compare, setCompare] = useState([]);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/forecasts")
      .then((response) => !cancelled && setData(response.data))
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Could not load the forecasts."));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const areas = useMemo(() => data?.subcategories ?? [], [data]);

  const decorated = useMemo(
    () =>
      areas.map((entry) => {
        const byHorizon = Object.fromEntries(
          entry.horizons.map((h) => [h.horizon_months, h])
        );
        const row = byHorizon[months];
        return {
          entry,
          row,
          key: trendKey(row),
          change: row?.pct_change ?? 0,
          name: entry.subcategory,
        };
      }),
    [areas, months]
  );

  const visible = useMemo(() => {
    const list = decorated.filter((item) => filter === "all" || item.key === filter);
    return [...list].sort((a, b) =>
      sortKey === "name" ? a.name.localeCompare(b.name) : b.change - a.change
    );
  }, [decorated, filter, sortKey]);

  const chartRows = useMemo(
    () =>
      [...visible].sort((a, b) => a.change - b.change).map((item) => ({
        name: item.name,
        change: Number(item.change.toFixed(1)),
        fill: TRENDS[item.key].chart,
      })),
    [visible]
  );

  const domain = useMemo(() => {
    const values = chartRows.map((r) => Math.abs(r.change));
    const peak = Math.max(0.5, ...values) * 1.6;
    return [-peak, peak];
  }, [chartRows]);

  const compared = decorated.filter((item) => compare.includes(item.name));

  function toggleCompare(name) {
    setCompare((current) =>
      current.includes(name) ? current.filter((n) => n !== name) : [...current, name]
    );
  }

  return (
    <Container className="py-14 lg:py-20">
      <div className="max-w-3xl">
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-accent">
          Market demand
        </p>
        <h1 className="mt-4 font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
          Where IT demand is heading
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-[1.7] text-muted">
          Which areas of IT work are growing, holding steady or cooling off, six
          and twelve months ahead.
        </p>
      </div>

      {loading && <p className="mt-10 text-muted">Loading forecasts...</p>}

      {error && (
        <p className="mt-10 rounded-[8px] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {data && (
        <>
          {/* Controls */}
          <Card className="mt-10 p-4 sm:p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
              <div>
                <span className="block text-sm font-medium text-ink">Time horizon</span>
                <div className="mt-2 inline-flex rounded-[8px] border border-line p-1">
                  {HORIZONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMonths(value)}
                      aria-pressed={months === value}
                      className={`h-9 rounded-[6px] px-4 text-sm transition-colors ${
                        months === value
                          ? "bg-brand text-surface"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      {value} months
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-ink">Show</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {FILTERS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      aria-pressed={filter === item.key}
                      className={`h-9 rounded-[8px] border px-3 text-sm transition-colors ${
                        filter === item.key
                          ? "border-brand bg-brand text-surface"
                          : "border-line bg-panel text-muted hover:border-ink/30 hover:text-ink"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:w-56">
                <label
                  htmlFor="forecast-sort"
                  className="flex items-center gap-1.5 text-sm font-medium text-ink"
                >
                  <ArrowUpDown size={15} strokeWidth={2} aria-hidden="true" />
                  Sort by
                </label>
                <select
                  id="forecast-sort"
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value)}
                  className="mt-2 h-11 w-full rounded-[8px] border border-line bg-panel px-3 text-[0.95rem]
                             text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                >
                  {Object.entries(SORTS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <p className="mt-6 text-sm text-muted">
            Showing <span className="font-medium text-ink">{visible.length}</span> of{" "}
            <span className="font-medium text-ink">{decorated.length}</span> areas
          </p>

          {visible.length === 0 ? (
            <Card className="mt-6 p-8">
              <h2 className="font-display text-xl font-semibold text-ink">
                No areas in that category
              </h2>
              <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted">
                Nothing is currently {FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} at
                this horizon. Try a different filter or switch between six and
                twelve months.
              </p>
              <div className="mt-6">
                <Button variant="secondary" onClick={() => setFilter("all")}>
                  Show all areas
                </Button>
              </div>
            </Card>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((item) => (
                <AreaCard
                  key={item.name}
                  entry={item.entry}
                  months={months}
                  selected={compare.includes(item.name)}
                  onToggleCompare={toggleCompare}
                />
              ))}
            </div>
          )}

          {/* Comparison */}
          {compare.length > 0 && (
            <Card className="mt-8 p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink">
                    Comparing {compare.length}{" "}
                    {compare.length === 1 ? "area" : "areas"}
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    {compare.length === 1
                      ? "Tick a second area to compare them side by side."
                      : "Side by side at the selected horizon."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCompare([])}
                  className="inline-flex items-center gap-1.5 text-sm text-muted underline underline-offset-4 hover:text-ink"
                >
                  <X size={14} strokeWidth={2} aria-hidden="true" />
                  Clear selection
                </button>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-sm text-muted">
                      <th className="py-2 pr-4 font-medium">Area</th>
                      <th className="py-2 pr-4 font-medium">Trend</th>
                      <th className="py-2 pr-4 font-medium">Now</th>
                      <th className="py-2 pr-4 font-medium">In 6 months</th>
                      <th className="py-2 pr-4 font-medium">In 12 months</th>
                      <th className="py-2 font-medium">Change ({months}mo)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compared.map((item) => {
                      const byHorizon = Object.fromEntries(
                        item.entry.horizons.map((h) => [h.horizon_months, h])
                      );
                      return (
                        <tr key={item.name} className="border-b border-line last:border-0">
                          <td className="py-3 pr-4 font-medium text-ink">{item.name}</td>
                          <td className="py-3 pr-4">
                            <TrendBadge trend={item.key} />
                          </td>
                          <td className="py-3 pr-4 text-muted">
                            {item.entry.current_demand?.toFixed(1)}
                          </td>
                          <td className="py-3 pr-4 text-muted">
                            {byHorizon[6]?.predicted_demand?.toFixed(1) ?? "n/a"}
                          </td>
                          <td className="py-3 pr-4 text-muted">
                            {byHorizon[12]?.predicted_demand?.toFixed(1) ?? "n/a"}
                          </td>
                          <td className={`py-3 font-medium ${TRENDS[item.key].text}`}>
                            {formatPct(item.change)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Ranking chart */}
          <Card className="mt-8 p-6 sm:p-7">
            <h2 className="font-display text-lg font-semibold text-ink">
              Projected change in demand, next {months} months
            </h2>
            <p className="mt-2 text-sm text-muted">
              Ranked from the biggest fall to the biggest rise. Bars to the right
              of the line are growing, bars to the left are cooling.
            </p>

            <div className="mt-6 w-full" style={{ height: Math.max(240, chartRows.length * 54) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartRows}
                  layout="vertical"
                  margin={{ top: 8, right: 56, bottom: 28, left: 8 }}
                >
                  <CartesianGrid stroke={colors.line} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={domain}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: colors.muted, fontSize: 12 }}
                    stroke={colors.line}
                    label={{
                      value: "Change in demand (%)",
                      position: "insideBottom",
                      offset: -16,
                      fill: colors.muted,
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fill: colors.ink, fontSize: 12 }}
                    stroke={colors.line}
                  />
                  <Tooltip
                    cursor={{ fill: colors.brandSoft }}
                    contentStyle={{
                      background: colors.panel,
                      border: `1px solid ${colors.line}`,
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                    formatter={(value) => [formatPct(value), `Change over ${months} months`]}
                  />
                  <ReferenceLine x={0} stroke={colors.ink} strokeWidth={1} />
                  <Bar dataKey="change" barSize={22} radius={[3, 3, 3, 3]}>
                    {chartRows.map((row) => (
                      <Cell key={row.name} fill={row.fill} />
                    ))}
                    <LabelList dataKey="change" content={<ValueLabel />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* How to read this, tucked away */}
          <Card className="mt-6">
            <button
              type="button"
              onClick={() => setShowHelp((value) => !value)}
              aria-expanded={showHelp}
              className="flex w-full items-center justify-between gap-4 p-5 text-left"
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                <Info size={16} strokeWidth={2} aria-hidden="true" />
                How to read this
              </span>
              <ChevronDown
                size={18}
                strokeWidth={2}
                aria-hidden="true"
                className={`shrink-0 text-muted transition-transform ${showHelp ? "rotate-180" : ""}`}
              />
            </button>

            {showHelp && (
              <div className="space-y-3 border-t border-line p-5 text-sm leading-relaxed text-muted">
                <p>
                  These figures are modelled from historical IT employment trends
                  used as a demand proxy, not from counts of Sri Lankan
                  vacancies. Each area is mapped to the closest available monthly
                  employment series, and some of those proxies are much closer
                  than others. Treat the direction as indicative and the exact
                  numbers as estimates.
                </p>
                <p>
                  The index is relative to a 2015 baseline, so a higher number
                  means more demand. The index itself is not a count of jobs, it
                  is only useful for comparing one point in time with another.
                </p>
                <p>
                  Model {data.model_version}, generated{" "}
                  {new Date(data.generated_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  .
                </p>
              </div>
            )}
          </Card>
        </>
      )}
    </Container>
  );
}
