import { useState, useEffect } from 'react';
import { metricsApi } from './api/metrics';
import { CapabilitiesContext } from './hooks/useCapabilities';
import { Dashboard } from './pages/Dashboard';
import { SlowLog } from './pages/SlowLog';
import { Clients } from './pages/Clients';
import type { DatabaseCapabilities } from './types/metrics';

type Page = 'dashboard' | 'slowlog' | 'clients';

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [capabilities, setCapabilities] = useState<DatabaseCapabilities | null>(null);

  useEffect(() => {
    metricsApi.getHealth()
      .then(health => {
        if (health.capabilities) {
          setCapabilities(health.capabilities);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <CapabilitiesContext.Provider value={capabilities}>
      <div className="min-h-screen bg-background">
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
          <div className="p-6">
            <h2 className="text-lg font-semibold">BetterDB Monitor</h2>
          </div>
          <nav className="space-y-1 px-3">
            <NavItem active={page === 'dashboard'} onClick={() => setPage('dashboard')}>
              Dashboard
            </NavItem>
            <NavItem active={page === 'slowlog'} onClick={() => setPage('slowlog')}>
              Slow Log
            </NavItem>
            <NavItem active={page === 'clients'} onClick={() => setPage('clients')}>
              Clients
            </NavItem>
          </nav>
        </aside>

        <main className="pl-64">
          <div className="p-8">
            {page === 'dashboard' && <Dashboard />}
            {page === 'slowlog' && <SlowLog />}
            {page === 'clients' && <Clients />}
          </div>
        </main>
      </div>
    </CapabilitiesContext.Provider>
  );
}

interface NavItemProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

function NavItem({ children, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

export default App;
