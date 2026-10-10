import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Plus, PackageSearch, TrendingUp, CheckCircle2, AlertCircle,
  Loader2, Inbox, Shield, FileSpreadsheet, MapPin, UserCircle, LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { LostFoundItem, ItemCategory, ItemStatus } from '@/types';
import { ALL_STATUS_FILTERS, CATEGORY_FILTERS } from '@/types';
import Modal from '@/components/Modal';
import ItemCard from '@/components/ItemCard';
import ReportForm from '@/components/ReportForm';
import ItemDetail from '@/components/ItemDetail';
import AdminReport from '@/components/AdminReport';
import AuthPage from '@/components/AuthPage';
import ProfilePage from '@/components/ProfilePage';

type StatusFilter = 'all' | ItemStatus;
type CategoryFilter = 'all' | ItemCategory;
type View = 'dashboard' | 'profile';

function App() {
  const { session, profile, loading, signOut } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [itemLoading, setItemLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LostFoundItem | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminReportOpen, setAdminReportOpen] = useState(false);

  const loadItems = useCallback(async () => {
    setItemLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('lost_found_items')
      .select('*')
      .order('created_at', { ascending: false });
    setItemLoading(false);
    if (error) {
      setLoadError('Could not load items. Please refresh the page.');
      return;
    }
    setItems((data as LostFoundItem[]) || []);
  }, []);

  useEffect(() => {
    if (session) loadItems();
  }, [session, loadItems]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.location));
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (locationFilter !== 'all' && item.location !== locationFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.name.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [items, statusFilter, categoryFilter, locationFilter, searchQuery]);

  const stats = useMemo(() => {
    const lost = items.filter((i) => i.status === 'lost').length;
    const found = items.filter((i) => i.status === 'found').length;
    const resolved = items.filter((i) => i.status === 'resolved').length;
    return { total: items.length, lost, found, resolved };
  }, [items]);

  const handleItemUpdated = (updated: LostFoundItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedItem(updated);
  };

  const handleItemDeleted = () => {
    if (selectedItem) {
      setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
      setSelectedItem(null);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setLocationFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== 'all' || locationFilter !== 'all' || searchQuery.trim();

  // Show auth page if not logged in
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  if (view === 'profile') {
    return (
      <div className="min-h-screen bg-slate-100">
        <Header
          view={view}
          setView={setView}
          isAdmin={isAdmin}
          setIsAdmin={setIsAdmin}
          adminReportOpen={adminReportOpen}
          setAdminReportOpen={setAdminReportOpen}
          setReportModalOpen={setReportModalOpen}
          profileName={profile?.full_name}
          onSignOut={signOut}
        />
        <ProfilePage onBack={() => setView('dashboard')} />
        <AdminReportModal isOpen={adminReportOpen} onClose={() => setAdminReportOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Header
        view={view}
        setView={setView}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        adminReportOpen={adminReportOpen}
        setAdminReportOpen={setAdminReportOpen}
        setReportModalOpen={setReportModalOpen}
        profileName={profile?.full_name}
        onSignOut={signOut}
      />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {isAdmin && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200 animate-fade-in">
            <Shield size={16} />
            <span><strong>Admin Mode active.</strong> You can update item statuses and remove fraudulent posts.</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<PackageSearch size={18} />} label="Total Items" value={stats.total} color="slate" />
          <StatCard icon={<AlertCircle size={18} />} label="Lost Items" value={stats.lost} color="rose" />
          <StatCard icon={<TrendingUp size={18} />} label="Found Items" value={stats.found} color="emerald" />
          <StatCard icon={<CheckCircle2 size={18} />} label="Recovered" value={stats.resolved} color="indigo" />
        </div>

        {/* Search + Filters */}
        <div className="mt-6 space-y-4">
          <div className="relative">
            <Search size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by item name, location, or description..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-4 pl-11 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ALL_STATUS_FILTERS.map((status) => {
              const dotColors: Record<string, string> = {
                lost: 'bg-rose-500', found: 'bg-emerald-500', claimed: 'bg-amber-500', resolved: 'bg-indigo-500',
              };
              return (
                <FilterChip
                  key={status} active={statusFilter === status} onClick={() => setStatusFilter(status)}
                  label={status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                  dotColor={status !== 'all' ? dotColors[status] : undefined}
                />
              );
            })}
            <div className="mx-1 h-5 w-px bg-slate-200" />
            {CATEGORY_FILTERS.map((cat) => (
              <FilterChip key={cat} active={categoryFilter === cat} onClick={() => setCategoryFilter(cat)} label={cat === 'all' ? 'All Categories' : cat} />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <MapPin size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
              <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
                className="appearance-none rounded-full border border-slate-200 bg-white py-1.5 pr-8 pl-9 text-xs font-semibold text-slate-600 transition-all hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                <option value="all">All Locations</option>
                {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Clear all filters</button>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-slate-500">{itemLoading ? 'Loading items...' : `${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''} found`}</p>
        </div>

        {loadError && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{loadError}</div>}

        {itemLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
            <p className="mt-3 text-sm text-slate-400">Loading items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Inbox size={32} className="text-slate-300" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-700">No items found</h3>
            <p className="mt-1 text-sm text-slate-400">
              {items.length === 0 ? 'Be the first to report a lost or found item.' : 'Try adjusting your search or filters.'}
            </p>
            {hasActiveFilters ? (
              <button onClick={clearFilters} className="mt-4 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Clear filters</button>
            ) : (
              <button onClick={() => setReportModalOpen(true)} className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700">
                <Plus size={16} /> Report an Item
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-400 sm:px-6">
          Campus Lost &amp; Found Portal — Helping students recover what matters.
        </div>
      </footer>

      {/* Report Modal */}
      <Modal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} title="Report an Item" subtitle="Lost something or found something? Let the campus know." maxWidth="max-w-xl">
        <ReportForm onSubmitted={() => { setReportModalOpen(false); loadItems(); }} onCancel={() => setReportModalOpen(false)} />
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title="Item Details" maxWidth="max-w-lg">
        {selectedItem && (
          <ItemDetail item={selectedItem} onClose={() => setSelectedItem(null)} onUpdated={handleItemUpdated} onDeleted={handleItemDeleted} isAdmin={isAdmin} />
        )}
      </Modal>

      <AdminReportModal isOpen={adminReportOpen} onClose={() => setAdminReportOpen(false)} />
    </div>
  );
}

// --- Header component ---
function Header({
  view, setView, isAdmin, setIsAdmin, adminReportOpen, setAdminReportOpen,
  setReportModalOpen, profileName, onSignOut,
}: {
  view: View;
  setView: (v: View) => void;
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
  adminReportOpen: boolean;
  setAdminReportOpen: (v: boolean) => void;
  setReportModalOpen: (v: boolean) => void;
  profileName?: string;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <PackageSearch size={22} />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Campus Lost &amp; Found</h1>
              <p className="hidden text-xs text-slate-400 sm:block">Reuniting students with their belongings</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {/* Admin toggle */}
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                isAdmin ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Shield size={16} />
              <span className="hidden sm:inline">{isAdmin ? 'Admin' : 'Security'}</span>
            </button>

            {isAdmin && view === 'dashboard' && (
              <button onClick={() => setAdminReportOpen(true)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50">
                <FileSpreadsheet size={16} />
                <span className="hidden lg:inline">Report</span>
              </button>
            )}

            {/* Report item button (dashboard only) */}
            {view === 'dashboard' && (
              <button onClick={() => setReportModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-95">
                <Plus size={18} />
                <span className="hidden sm:inline">Report Item</span>
                <span className="sm:hidden">Report</span>
              </button>
            )}

            {/* Profile button */}
            <button
              onClick={() => setView(view === 'profile' ? 'dashboard' : 'profile')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                view === 'profile' ? 'bg-indigo-100 text-indigo-700' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <UserCircle size={16} />
              <span className="hidden sm:inline">{profileName?.split(' ')[0] || 'Profile'}</span>
            </button>

            {/* Sign out */}
            <button onClick={onSignOut} className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600" title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// --- Admin report modal wrapper ---
function AdminReportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Summary Report" subtitle="Overview of resolved and claimed campus items." maxWidth="max-w-3xl">
      <AdminReport onDownload={() => {}} />
    </Modal>
  );
}

// --- Stat card ---
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: 'slate' | 'rose' | 'emerald' | 'indigo' }) {
  const colorMap = {
    slate: 'bg-slate-100 text-slate-600',
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:shadow-md sm:p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorMap[color]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-slate-900 sm:text-2xl">{value}</p>
        <p className="truncate text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

// --- Filter chip ---
function FilterChip({ active, onClick, label, dotColor }: { active: boolean; onClick: () => void; label: string; dotColor?: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
        active ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {dotColor && <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />}
      {label}
    </button>
  );
}

export default App;
