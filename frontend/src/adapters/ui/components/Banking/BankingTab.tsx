import { useState } from 'react';
import { useAsync, useMutation } from '../../../../shared/hooks/useAsync';
import { complianceApi, bankingApi } from '../../../infrastructure/api.client';
import { formatCB } from '../../../../shared/utils/format';
import {
  Spinner, ErrorBanner, KpiCard, Table, Tr, Td, Button, Input, Select, SectionHeader,
} from '../shared/primitives';

const SHIP_OPTIONS = ['R001', 'R002', 'R003', 'R004', 'R005'].map(s => ({ label: s, value: s }));
const YEAR_OPTIONS = [2024, 2025].map(y => ({ label: String(y), value: String(y) }));

export function BankingTab() {
  const [shipId, setShipId] = useState('R001');
  const [year, setYear] = useState('2024');
  const [bankAmount, setBankAmount] = useState('');
  const [applyAmount, setApplyAmount] = useState('');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const cbQuery = useAsync(
    () => complianceApi.getCB(shipId, Number(year)),
    [shipId, year]
  );

  const bankRecordsQuery = useAsync(
    () => bankingApi.getBankRecords(shipId, Number(year)),
    [shipId, year]
  );

  const { mutate: doBank, state: bankState } = useMutation(bankingApi.bankSurplus);
  const { mutate: doApply, state: applyState } = useMutation(bankingApi.applyBanked);

  const refresh = () => {
    cbQuery.refetch();
    bankRecordsQuery.refetch();
    setActionMsg(null);
  };

  const handleBank = async () => {
    const amt = Number(bankAmount);
    if (!amt || amt <= 0) return;

    const result = await doBank(shipId, Number(year), amt);
    if (result) {
      setActionMsg(
        `✓ Banked ${formatCB(result.entry?.amountGco2eq ?? amt)}. ` +
        `CB: ${formatCB(result.cbBefore)} → ${formatCB(result.cbAfter)}`
      );
      setBankAmount('');
      refresh();
    }
  };

  const handleApply = async () => {
    const amt = Number(applyAmount);
    if (!amt || amt <= 0) return;

    const result = await doApply(shipId, Number(year), amt);
    if (result) {
      setActionMsg(
        `✓ Applied ${formatCB(result.applied ?? amt)} from bank. ` +
        `CB: ${formatCB(result.cbBefore)} → ${formatCB(result.cbAfter)}`
      );
      setApplyAmount('');
      refresh();
    }
  };

  /* ---------- SAFE DERIVED VALUES ---------- */

  const cb =
    cbQuery.status === 'success'
      ? cbQuery.data!.cbGco2eq
      : 0;

  const available =
    bankRecordsQuery.status === 'success'
      ? bankRecordsQuery.data!.totalAvailable
      : 0;

  const totalBanked =
    bankRecordsQuery.status === 'success'
      ? bankRecordsQuery.data!.totalBanked
      : 0;

  const entries =
    bankRecordsQuery.status === 'success'
      ? bankRecordsQuery.data!.entries
      : [];

  const cbLoading = cbQuery.status === 'loading';

  /* ---------------------------------------- */

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Banking — Article 20"
        subtitle="Bank surplus compliance balance for future use, or apply banked credits to cover deficits"
      />

      {/* Ship / Year selector */}
      <div className="flex flex-wrap gap-3">
        <Select value={shipId} onChange={setShipId} options={SHIP_OPTIONS} placeholder="Ship ID" />
        <Select value={year} onChange={setYear} options={YEAR_OPTIONS} placeholder="Year" />
        <Button variant="secondary" onClick={refresh}>Refresh</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Compliance Balance"
          value={cbLoading ? '…' : formatCB(cb)}
          variant={cb > 0 ? 'positive' : cb < 0 ? 'negative' : 'neutral'}
          loading={cbLoading}
        />
        <KpiCard
          label="Banked Available"
          value={bankRecordsQuery.status === 'success' ? formatCB(available) : '…'}
          variant={available > 0 ? 'positive' : 'neutral'}
          loading={bankRecordsQuery.status === 'loading'}
        />
        <KpiCard
          label="Total Ever Banked"
          value={bankRecordsQuery.status === 'success' ? formatCB(totalBanked) : '…'}
          loading={bankRecordsQuery.status === 'loading'}
        />
      </div>

      {cbQuery.status === 'error' && (
        <ErrorBanner message={cbQuery.error ?? ''} onRetry={cbQuery.refetch} />
      )}

      {actionMsg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {actionMsg}
        </div>
      )}

      {/* Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Bank surplus */}
        <div className="rounded-xl border border-navy-600 bg-navy-800/60 p-5">
          <h3 className="mb-1 text-sm font-semibold text-white">Bank Surplus</h3>
          <p className="mb-4 text-xs text-slate-500">Store positive CB for future years.</p>

          <Input
            label="Amount to bank (gCO₂e)"
            type="number"
            value={bankAmount}
            onChange={setBankAmount}
            placeholder="e.g. 1000000"
          />

          {bankState.status === 'error' && (
            <ErrorBanner message={bankState.error ?? ''} />
          )}

          <Button
            onClick={handleBank}
            loading={bankState.status === 'loading'}
            disabled={cb <= 0 || !bankAmount || Number(bankAmount) <= 0}
            className="w-full justify-center"
          >
            Bank Surplus
          </Button>
        </div>

        {/* Apply banked */}
        <div className="rounded-xl border border-navy-600 bg-navy-800/60 p-5">
          <h3 className="mb-1 text-sm font-semibold text-white">Apply Banked Credits</h3>
          <p className="mb-4 text-xs text-slate-500">Use previously banked surplus to offset a deficit.</p>

          <Input
            label="Amount to apply (gCO₂e)"
            type="number"
            value={applyAmount}
            onChange={setApplyAmount}
            placeholder="e.g. 500000"
          />

          {applyState.status === 'error' && (
            <ErrorBanner message={applyState.error ?? ''} />
          )}

          <Button
            onClick={handleApply}
            loading={applyState.status === 'loading'}
            disabled={available <= 0 || !applyAmount || Number(applyAmount) <= 0}
            variant="secondary"
            className="w-full justify-center"
          >
            Apply to Deficit
          </Button>
        </div>
      </div>

      {/* Bank entry history */}
      {bankRecordsQuery.status === 'loading' && (
        <div className="flex justify-center py-6"><Spinner /></div>
      )}

      {bankRecordsQuery.status === 'success' && (
        <>
          <SectionHeader title="Bank Entry History" />
          <Table
            headers={['Entry ID', 'Banked (gCO₂e)', 'Remaining (gCO₂e)', 'Used', 'Date']}
            isEmpty={entries.length === 0}
            empty="No bank entries for this ship and year."
          >
            {entries.map(e => {
              const used = e.amountGco2eq - e.remainingGco2eq;
              return (
                <Tr key={e.id}>
                  <Td mono>{e.id.slice(0, 8)}…</Td>
                  <Td mono>{formatCB(e.amountGco2eq)}</Td>
                  <Td mono>
                    <span className={e.remainingGco2eq > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                      {formatCB(e.remainingGco2eq)}
                    </span>
                  </Td>
                  <Td mono>{formatCB(used)}</Td>
                  <Td mono>{new Date(e.createdAt).toLocaleDateString()}</Td>
                </Tr>
              );
            })}
          </Table>
        </>
      )}
    </div>
  );
}