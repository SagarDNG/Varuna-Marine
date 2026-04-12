import { useState } from 'react';
import { RoutesTab } from './adapters/ui/components/Routes/RoutesTab';
import { CompareTab } from './adapters/ui/components/Compare/CompareTab';
import { BankingTab } from './adapters/ui/components/Banking/BankingTab';
import { PoolingTab } from './adapters/ui/components/Pooling/PoolingTab';

type Tab = 'routes' | 'compare' | 'banking' | 'pooling';

const TABS: { id: Tab; label: string; icon: string; subtitle: string }[] = [
  { id: 'routes',  label: 'Routes',  icon: '🗺', subtitle: 'Fleet overview' },
  { id: 'compare', label: 'Compare', icon: '⚖', subtitle: 'GHG analysis' },
  { id: 'banking', label: 'Banking', icon: '🏦', subtitle: 'Article 20' },
  { id: 'pooling', label: 'Pooling', icon: '🔗', subtitle: 'Article 21' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('routes');

  return (
    <div className="min-h-screen bg-navy-950 text-slate-200">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-ocean-600/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-emerald-500/3 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-navy-700/60 bg-navy-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ocean-500/20 text-lg">
                ⛵
              </div>
              <div>
                <h1 className="font-semibold leading-tight text-white">FuelEU Maritime</h1>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">
                  Compliance Platform · EU 2023/1805
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Nav */}
      <div className="border-b border-navy-700/40 bg-navy-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto py-1 scrollbar-none">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium
                    transition-all duration-150
                    ${active
                      ? 'bg-ocean-500/15 text-ocean-400'
                      : 'text-slate-500 hover:bg-navy-800 hover:text-slate-300'
                    }
                  `}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className={`text-xs ${active ? 'text-ocean-400/60' : 'text-slate-600'}`}>
                    {tab.subtitle}
                  </span>
                  {active && (
                    <span className="ml-auto h-1 w-1 rounded-full bg-ocean-400" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'routes'  && <RoutesTab />}
        {activeTab === 'compare' && <CompareTab />}
        {activeTab === 'banking' && <BankingTab />}
        {activeTab === 'pooling' && <PoolingTab />}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-navy-800 py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-700 sm:px-6 lg:px-8">
          FuelEU Maritime Compliance · Regulation (EU) 2023/1805 · Target 89.3368 gCO₂e/MJ (2025)
        </div>
      </footer>
    </div>
  );
}
