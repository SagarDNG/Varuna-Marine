import { useAsync } from '../../../../shared/hooks/useAsync';
import { routeApi } from '../../../infrastructure/api.client';
import { formatGHG, formatPercent, isCompliant } from '../../../../shared/utils/format';
import type { ComparisonResult } from '../../../../core/domain/types';
import { TARGET_INTENSITY } from '../../../../core/domain/types';
import {
  Spinner,
  ErrorBanner,
  Badge,
  Table,
  Tr,
  Td,
  SectionHeader,
  KpiCard,
} from '../shared/primitives';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

export function CompareTab() {
  const { status, data, error, refetch } = useAsync(
    () => routeApi.getComparison(),
    []
  );

  if (status === 'loading') {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <ErrorBanner
        message={error ?? 'Failed to load comparison data'}
        onRetry={refetch}
      />
    );
  }

  if (status !== 'success' || data === null) {
    return null;
  }

  const { baseline, comparisons } = data;

  const compliantCount = comparisons.filter(
    (c: ComparisonResult) => c.compliant
  ).length;

  const chartData = [
    {
      name: baseline.routeId,
      ghg: baseline.ghgIntensity,
      isBaseline: true,
      compliant: isCompliant(baseline.ghgIntensity),
    },
    ...comparisons.map((c: ComparisonResult) => ({
      name: c.comparisonRoute.routeId,
      ghg: c.comparisonRoute.ghgIntensity,
      isBaseline: false,
      compliant: c.compliant,
    })),
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="GHG Intensity Comparison"
        subtitle={`Baseline: ${baseline.routeId} (${baseline.vesselType} · ${baseline.fuelType} · ${baseline.year})`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Baseline GHG"
          value={baseline.ghgIntensity.toFixed(2)}
          unit="gCO₂e/MJ"
        />
        <KpiCard
          label="Target (2025)"
          value={TARGET_INTENSITY.toFixed(4)}
          unit="gCO₂e/MJ"
          variant="positive"
        />
        <KpiCard
          label="Compliant Routes"
          value={`${compliantCount} / ${comparisons.length}`}
          variant={
            compliantCount === comparisons.length ? 'positive' : 'negative'
          }
        />
        <KpiCard
          label="Baseline Compliant"
          value={isCompliant(baseline.ghgIntensity) ? 'Yes ✓' : 'No ✗'}
          variant={
            isCompliant(baseline.ghgIntensity) ? 'positive' : 'negative'
          }
        />
      </div>

      {/* Bar Chart */}
      <div className="rounded-xl border border-navy-600 bg-navy-800/60 p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
          GHG Intensity vs. FuelEU 2025 Target
        </p>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis domain={[85, 96]} />
            <Tooltip
              formatter={(value: number) => [
                `${value.toFixed(4)} gCO₂e/MJ`,
                'GHG Intensity',
              ]}
            />
            <Legend />
            <ReferenceLine
              y={TARGET_INTENSITY}
              stroke="#f59e0b"
              strokeDasharray="6 3"
              label={`Target ${TARGET_INTENSITY}`}
            />
            <Bar dataKey="ghg" maxBarSize={60}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.isBaseline
                      ? '#0ea5e9'
                      : entry.compliant
                      ? '#10b981'
                      : '#f43f5e'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Comparison Table */}
      <Table
        headers={[
          'Route',
          'Vessel',
          'Fuel',
          'Year',
          'GHG Intensity',
          'vs Baseline',
          'Compliant',
        ]}
        isEmpty={comparisons.length === 0}
        empty="No comparison routes available. Set a baseline first."
      >
        {comparisons.map((c: ComparisonResult) => (
          <Tr key={c.comparisonRoute.id}>
            <Td mono>{c.comparisonRoute.routeId}</Td>
            <Td>{c.comparisonRoute.vesselType}</Td>
            <Td>
              <Badge variant="neutral">{c.comparisonRoute.fuelType}</Badge>
            </Td>
            <Td mono>{c.comparisonRoute.year}</Td>
            <Td mono>
              <span
                className={
                  isCompliant(c.comparisonRoute.ghgIntensity)
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }
              >
                {formatGHG(c.comparisonRoute.ghgIntensity)}
              </span>
            </Td>
            <Td mono>
              <span
                className={
                  c.percentDiff < 0 ? 'text-emerald-400' : 'text-rose-400'
                }
              >
                {formatPercent(c.percentDiff)}
              </span>
            </Td>
            <Td>
              <Badge variant={c.compliant ? 'compliant' : 'noncompliant'}>
                {c.compliant ? '✓ Yes' : '✗ No'}
              </Badge>
            </Td>
          </Tr>
        ))}
      </Table>
    </div>
  );
}