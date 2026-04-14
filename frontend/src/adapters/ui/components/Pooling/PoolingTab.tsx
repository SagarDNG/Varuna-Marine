import { useState } from 'react';
import { useAsync, useMutation } from '../../../../shared/hooks/useAsync';
import { poolingApi, complianceApi } from '../../../infrastructure/api.client';
import { formatCB, cbClass } from '../../../../shared/utils/format';
import type { Pool } from '../../../../core/domain/types';
import {
  Spinner, ErrorBanner, Badge, Table, Tr, Td, Button, Input, Select, SectionHeader,
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

  const { mutate: createPool, state: createState } = useMutation(poolingApi.createPool);

  const getMemberCB = (m: MemberInput): number => {
    if (m.cbOverride !== '') return Number(m.cbOverride);
    if (m.cbFetched !== undefined) return m.cbFetched;
    return 0;
  };

  const poolSum = members.reduce((s, m) => s + getMemberCB(m), 0);
  const allMembersHaveValues = members.every(m => m.cbOverride !== '' || m.cbFetched !== undefined);
  const poolValid = members.length >= 2 && poolSum >= 0 && allMembersHaveValues;

  const addMember = () => {
    const used = new Set(members.map(m => m.shipId));
    const next = ALL_SHIPS.find(s => !used.has(s));
    if (next) setMembers([...members, { shipId: next, cbOverride: '' }]);
  };

  const removeMember = (i: number) => setMembers(members.filter((_, idx) => idx !== i));

  const updateMember = (i: number, field: keyof MemberInput, value: string) =>
    setMembers(members.map((m, idx) => idx === i ? { ...m, [field]: value } : m));

  const fetchCB = async (i: number) => {
    const m = members[i];
    try {
      const res = await complianceApi.getCB(m.shipId, Number(year));
      setMembers(prev => prev.map((pm, idx) =>
        idx === i ? { ...pm, cbFetched: res.cbGco2eq } : pm
      ));
    } catch (_) { /* ignore */ }
  };

  const handleCreate = async () => {
    const payload = members.map(m => ({
      shipId: m.shipId,
      cbOverride: m.cbOverride !== '' ? Number(m.cbOverride) : m.cbFetched,
    }));
    const pool = await createPool(Number(year), payload);
    if (pool) poolsQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Pooling — Article 21"
        subtitle="Create compliance pools across vessels. Pool sum must be ≥ 0 and no surplus ship may exit negative."
      />

      <div className="flex flex-wrap gap-3">
        <Select value={year} onChange={setYear} options={YEAR_OPTIONS} placeholder="Year" />
      </div>

      {/* Pool Builder */}
      <div className="rounded-xl border border-navy-600 bg-navy-800/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">New Pool</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Pool Sum:</span>
            <span className={`font-mono text-sm font-semibold ${
              !allMembersHaveValues
                ? 'text-slate-500'
                : poolSum >= 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
            }`}>
              {formatCB(poolSum)}
              {allMembersHaveValues && (poolSum >= 0 ? ' ✓' : ' ✗')}
            </span>
          </div>
        </div>

        <div className="mb-4 space-y-3">
          {members.map((m, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg bg-navy-900/60 p-3">
              <Select
                value={m.shipId}
                onChange={v => updateMember(i, 'shipId', v)}
                options={ALL_SHIPS.map(s => ({ label: s, value: s }))}
                placeholder="Ship"
              />
              <Input
                label="CB Override (gCO₂e)"
                type="number"
                value={m.cbOverride}
                onChange={v => updateMember(i, 'cbOverride', v)}
                placeholder={m.cbFetched !== undefined ? formatCB(m.cbFetched) : 'manual or fetch'}
              />
              <Button variant="ghost" onClick={() => fetchCB(i)}>
                Fetch CB
              </Button>
              {m.cbFetched !== undefined && (
                <span className={`text-xs font-mono ${cbClass(m.cbFetched)}`}>
                  DB: {formatCB(m.cbFetched)}
                </span>
              )}
              {members.length > 2 && (
                <Button variant="danger" onClick={() => removeMember(i)}>Remove</Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={addMember} disabled={members.length >= ALL_SHIPS.length}>
            + Add Member
          </Button>
          {!poolValid && members.length >= 2 && poolSum < 0 && (
            <span className="self-center text-xs text-rose-400">
              Pool sum is negative — cannot create pool
            </span>
          )}
          {createState.status === 'error' && <ErrorBanner message={createState.error || 'An error occurred'} />}
        </div>

        <div className="mt-4 border-t border-navy-700 pt-4">
          <Button
            onClick={handleCreate}
            loading={createState.status === 'loading'}
            disabled={!poolValid}
            className="w-full justify-center"
          >
            Create Pool
          </Button>
        </div>
      </div>

      {/* Pool Rules reminder */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-400/80">
        <strong className="font-semibold text-amber-400">Article 21 Rules:</strong>
        {' '}Pool sum (∑CB) must be ≥ 0 · Deficit ships cannot exit worse than they entered ·
        Surplus ships cannot exit with negative CB
      </div>

      {/* Existing Pools */}
      {poolsQuery.status === 'loading' && (
        <div className="flex justify-center py-6"><Spinner /></div>
      )}
      {poolsQuery.status === 'error' && (
        <ErrorBanner message={poolsQuery.error || 'An error occurred'} onRetry={poolsQuery.refetch} />
      )}
      {poolsQuery.status === 'success' && poolsQuery.data && (
        <>
          <SectionHeader title={`Pools for ${year}`} subtitle={`${poolsQuery.data.length} pool(s) created`} />
          {poolsQuery.data.length === 0 ? (
            <p className="text-sm text-slate-500">No pools created for {year} yet.</p>
          ) : (
            <div className="space-y-4">
              {poolsQuery.data.map((pool: Pool) => (
                <div key={pool.id} className="rounded-xl border border-navy-600 bg-navy-800/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs text-slate-500">Pool ID: </span>
                      <span className="font-mono text-xs text-white">{pool.id.slice(0, 12)}…</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Sum:</span>
                      <Badge variant={pool.poolSum >= 0 ? 'surplus' : 'deficit'}>
                        {formatCB(pool.poolSum)}
                      </Badge>
                      <span className="text-xs text-slate-500">{new Date(pool.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <Table headers={['Ship', 'CB Before', 'CB After', 'Change']}>
                    {pool.members.map(m => {
                      const change = m.cbAfter - m.cbBefore;
                      return (
                        <Tr key={m.shipId}>
                          <Td mono><span className="font-semibold text-white">{m.shipId}</span></Td>
                          <Td mono><span className={cbClass(m.cbBefore)}>{formatCB(m.cbBefore)}</span></Td>
                          <Td mono><span className={cbClass(m.cbAfter)}>{formatCB(m.cbAfter)}</span></Td>
                          <Td mono>
                            <span className={change >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {change >= 0 ? '+' : ''}{formatCB(change)}
                            </span>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Table>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}