import { useState } from 'react';
import { useAsync, useMutation } from '../../../../shared/hooks/useAsync';
import { routeApi } from '../../../infrastructure/api.client';
import { formatGHG, formatNumber, isCompliant } from '../../../../shared/utils/format';
import type { Route, RouteFilters } from '../../../../core/domain/types';
import {
  Spinner,
  ErrorBanner,
  Badge,
  Table,
  Tr,
  Td,
  Select,
  Button,
  SectionHeader,
} from '../shared/primitives';

const VESSEL_OPTIONS = ['Container', 'BulkCarrier', 'Tanker', 'RoRo'].map(v => ({ label: v, value: v }));
const FUEL_OPTIONS = ['HFO', 'LNG', 'MGO', 'VLSFO', 'Methanol', 'Ammonia'].map(v => ({ label: v, value: v }));
const YEAR_OPTIONS = [2024, 2025, 2026].map(y => ({ label: String(y), value: String(y) }));

export function RoutesTab() {
  const [filters, setFilters] = useState<RouteFilters>({});

  const { status, data, error, refetch } = useAsync(
    () => routeApi.getRoutes(filters),
    [filters]
  );

  const { mutate: setBaseline, state: baselineState } =
    useMutation(routeApi.setBaseline);

  const routes: Route[] =
    status === 'success' && data ? data : [];

  const handleSetBaseline = async (id: string) => {
    await setBaseline(id);
    refetch();
  };

  const setFilter = (key: keyof RouteFilters, value: string) =>
    setFilters(f => ({ ...f, [key]: value || undefined }));

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Routes"
        subtitle="All vessel routes with GHG intensity and fuel consumption data"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Filter:
        </span>
        <Select
          value={filters.vesselType ?? ''}
          onChange={v => setFilter('vesselType', v)}
          options={VESSEL_OPTIONS}
          placeholder="Vessel Type"
        />
        <Select
          value={filters.fuelType ?? ''}
          onChange={v => setFilter('fuelType', v)}
          options={FUEL_OPTIONS}
          placeholder="Fuel Type"
        />
        <Select
          value={filters.year ?? ''}
          onChange={v => setFilter('year', v)}
          options={YEAR_OPTIONS}
          placeholder="Year"
        />
        {Object.keys(filters).some(k => filters[k as keyof RouteFilters]) && (
          <Button variant="ghost" onClick={() => setFilters({})}>
            Clear
          </Button>
        )}
      </div>

      {baselineState.status === 'error' && (
        <ErrorBanner message={baselineState.error ?? ''} />
      )}

      {status === 'loading' && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {status === 'error' && (
        <ErrorBanner message={error ?? ''} onRetry={refetch} />
      )}

      {status === 'success' && (
        <>
          <Table
            headers={[
              'Route ID',
              'Vessel',
              'Fuel',
              'Year',
              'GHG Intensity',
              'Consumption (t)',
              'Distance (km)',
              'Emissions (t)',
              'Compliance',
              '',
            ]}
            isEmpty={routes.length === 0}
            empty="No routes match the current filters."
          >
            {routes.map((r: Route) => (
              <Tr key={r.id} highlight={r.isBaseline}>
                <Td mono>
                  <span className="font-semibold text-white">{r.routeId}</span>
                  {r.isBaseline && (
                    <Badge variant="neutral">&nbsp;baseline</Badge>
                  )}
                </Td>
                <Td>{r.vesselType}</Td>
                <Td>
                  <Badge variant="neutral">{r.fuelType}</Badge>
                </Td>
                <Td mono>{r.year}</Td>
                <Td mono>
                  <span
                    className={
                      isCompliant(r.ghgIntensity)
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }
                  >
                    {formatGHG(r.ghgIntensity)}
                  </span>
                </Td>
                <Td mono>{formatNumber(r.fuelConsumption)}</Td>
                <Td mono>{formatNumber(r.distance)}</Td>
                <Td mono>{formatNumber(r.totalEmissions)}</Td>
                <Td>
                  <Badge
                    variant={
                      isCompliant(r.ghgIntensity)
                        ? 'compliant'
                        : 'noncompliant'
                    }
                  >
                    {isCompliant(r.ghgIntensity)
                      ? '✓ Compliant'
                      : '✗ Non-compliant'}
                  </Badge>
                </Td>
                <Td>
                  <Button
                    variant={r.isBaseline ? 'ghost' : 'secondary'}
                    disabled={
                      r.isBaseline ||
                      baselineState.status === 'loading'
                    }
                    onClick={() => handleSetBaseline(r.id)}
                  >
                    {r.isBaseline ? 'Baseline' : 'Set Baseline'}
                  </Button>
                </Td>
              </Tr>
            ))}
          </Table>

          <p className="text-right text-xs text-slate-600">
            Target: 89.3368 gCO₂e/MJ (FuelEU 2025) · {routes.length} route
            {routes.length !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  );
}