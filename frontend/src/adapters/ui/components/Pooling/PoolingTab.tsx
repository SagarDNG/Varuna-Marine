import { useState } from 'react';
import { useAsync, useMutation } from '../../../../shared/hooks/useAsync';
import { poolingApi, complianceApi } from '../../../infrastructure/api.client';
import { formatCB, cbClass } from '../../../../shared/utils/format';
import type { Pool } from '../../../../core/domain/types';
import {
  Spinner,
  ErrorBanner,
  Table,
  Tr,
  Td,
  Button,
  Input,
  Select,
  SectionHeader,
} from '../shared/primitives';

const YEAR_OPTIONS = [2024, 2025].map(y => ({ label: String(y), value: String(y) }));
const ALL_SHIPS = ['R001', 'R002', 'R003', 'R004', 'R005'];

interface MemberInput {
  shipId: string;
  cbOverride: string;
  cbFetched?: number;
}

export function PoolingTab() {
  const [year, setYear] = useState('2024');
  const [members, setMembers] = useState<MemberInput[]>([
    { shipId: 'R001', cbOverride: '' },
    { shipId: 'R002', cbOverride: '' },
  ]);

  const poolsQuery = useAsync(
    () => poolingApi.getPools(Number(year)),
    [year]
  );

  const { mutate: createPool, state: createState } =
    useMutation(poolingApi.createPool);

  const poolSum = members.reduce((s, m) => {
    const val =
      m.cbOverride !== '' ? Number(m.cbOverride) : m.cbFetched ?? 0;
    return s + val;
  }, 0);

  const poolValid = members.length >= 2 && poolSum >= 0;

  const removeMember = (i: number) =>
    setMembers(members.filter((_, idx) => idx !== i));

  const updateMember = (
    i: number,
    field: keyof MemberInput,
    value: string
  ) =>
    setMembers(
      members.map((m, idx) =>
        idx === i ? { ...m, [field]: value } : m
      )
    );

  const fetchCB = async (i: number) => {
    const m = members[i];
    try {
      const res = await complianceApi.getCB(m.shipId, Number(year));
      setMembers(prev =>
        prev.map((pm, idx) =>
          idx === i ? { ...pm, cbFetched: res.cbGco2eq } : pm
        )
      );
    } catch {
      /* ignore */
    }
  };

  const handleCreate = async () => {
    const payload = members.map(m => ({
      shipId: m.shipId,
      cbOverride:
        m.cbOverride !== '' ? Number(m.cbOverride) : m.cbFetched,
    }));
    const pool = await createPool(Number(year), payload);
    if (pool) poolsQuery.refetch();
  };

  const pools =
    poolsQuery.status === 'success' && poolsQuery.data
      ? poolsQuery.data
      : [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Pooling — Article 21"
        subtitle="Create compliance pools across vessels. Pool sum must be ≥ 0 and no surplus ship may exit negative."
      />

      <div className="flex flex-wrap gap-3">
        <Select value={year} onChange={setYear} options={YEAR_OPTIONS} />
      </div>

      {/* Pool Builder */}
      <div className="rounded-xl border border-navy-600 bg-navy-800/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">New Pool</h3>
          <span
            className={`font-mono text-sm font-semibold ${
              poolSum >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCB(poolSum)} {poolSum >= 0 ? '✓' : '✗'}
          </span>
        </div>

        <div className="mb-4 space-y-3">
          {members.map((m, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-2 rounded-lg bg-navy-900/60 p-3"
            >
              <Select
                value={m.shipId}
                onChange={v => updateMember(i, 'shipId', v)}
                options={ALL_SHIPS.map(s => ({ label: s, value: s }))}
              />
              <Input
                label="CB Override (gCO₂e)"
                type="number"
                value={m.cbOverride}
                onChange={v => updateMember(i, 'cbOverride', v)}
                placeholder={
                  m.cbFetched !== undefined
                    ? formatCB(m.cbFetched)
                    : 'manual or fetch'
                }
              />
              <Button variant="ghost" onClick={() => fetchCB(i)}>
                Fetch CB
              </Button>
              {members.length > 2 && (
                <Button variant="danger" onClick={() => removeMember(i)}>
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>

        {createState.status === 'error' && (
          <ErrorBanner message={createState.error ?? ''} />
        )}

        <Button
          onClick={handleCreate}
          loading={createState.status === 'loading'}
          disabled={!poolValid}
          className="w-full justify-center"
        >
          Create Pool
        </Button>
      </div>

      {/* Existing Pools */}
      {poolsQuery.status === 'loading' && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}

      {poolsQuery.status === 'error' && (
        <ErrorBanner
          message={poolsQuery.error ?? ''}
          onRetry={poolsQuery.refetch}
        />
      )}

      {pools.length > 0 && (
        <>
          <SectionHeader
            title={`Pools for ${year}`}
            subtitle={`${pools.length} pool(s) created`}
          />
          {pools.map((pool: Pool) => (
            <div
              key={pool.id}
              className="rounded-xl border border-navy-600 bg-navy-800/40 p-4"
            >
              <Table headers={['Ship', 'CB Before', 'CB After', 'Change']}>
                {pool.members.map(m => {
                  const change = m.cbAfter - m.cbBefore;
                  return (
                    <Tr key={m.shipId}>
                      <Td mono>{m.shipId}</Td>
                      <Td mono>
                        <span className={cbClass(m.cbBefore)}>
                          {formatCB(m.cbBefore)}
                        </span>
                      </Td>
                      <Td mono>
                        <span className={cbClass(m.cbAfter)}>
                          {formatCB(m.cbAfter)}
                        </span>
                      </Td>
                      <Td mono>{formatCB(change)}</Td>
                    </Tr>
                  );
                })}
              </Table>
            </div>
          ))}
        </>
      )}
    </div>
  );
}