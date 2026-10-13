import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  History, 
  Calendar, 
  User, 
  Layers, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Filter, 
  RefreshCw, 
  ShieldCheck, 
  Package, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'react-toastify';
import { formatTransactionDateTime, getLocalDateString } from '../utils/dateUtils';

export default function StockHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [metrics, setMetrics] = useState({ totalMovements: 0, totalInQty: 0, totalOutQty: 0 });

  // Filters
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [movementType, setMovementType] = useState('All');
  const [selectedItem, setSelectedItem] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 50 });

  const calculateDateBounds = () => {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    let startDate = '';

    if (dateRange === 'Today') {
      startDate = todayStr;
    } else if (dateRange === 'Last 7 Days') {
      startDate = getLocalDateString(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    } else if (dateRange === 'Last 30 Days') {
      startDate = getLocalDateString(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    } else if (dateRange === 'Last 6 Months') {
      startDate = getLocalDateString(new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000));
    }

    return { startDate, endDate: dateRange === 'All Time' ? '' : todayStr };
  };

  const fetchTransactions = async (pageToFetch = 1) => {
    setLoading(true);
    try {
      const { startDate, endDate } = calculateDateBounds();
      const params = {
        page: pageToFetch,
        limit: 50,
        type: movementType !== 'All' ? movementType : undefined,
        itemId: selectedItem !== 'All' ? selectedItem : undefined,
        employee: selectedEmployee !== 'All' ? selectedEmployee : undefined,
        search: searchQuery.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      const res = await axios.get('/api/transactions', { params });
      if (res.data.success) {
        setTransactions(res.data.data || []);
        setPagination(res.data.pagination || { total: 0, pages: 1, limit: 50 });
        if (res.data.metrics) {
          setMetrics(res.data.metrics);
        }
      }
    } catch (err) {
      console.error('Failed to load transaction history:', err);
      toast.error('Unable to fetch stock audit ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial data fetch
    fetchTransactions(1);

    // Load filter dropdown options
    axios.get('/api/inventory?includeArchived=true')
      .then(res => {
        if (res.data.success) setItems(res.data.data || []);
      })
      .catch(() => {});

    axios.get('/api/technicians')
      .then(res => {
        setTechnicians(res.data.data || []);
      })
      .catch(() => {});
  }, []);

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchTransactions(1);
  };

  const handleResetFilters = () => {
    setDateRange('Last 30 Days');
    setMovementType('All');
    setSelectedItem('All');
    setSelectedEmployee('All');
    setSearchQuery('');
    setPage(1);
    setTimeout(() => fetchTransactions(1), 0);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* TOP BANNER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Movement History</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Immutable Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Complete transactional audit trail of all warehouse inward restocks and outward field dispatches.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchTransactions(page)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Feed
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Movements</p>
          <p className="text-2xl font-black font-mono text-slate-900 mt-1">{pagination.total}</p>
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Filtered audit transactions
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Stock In</p>
          <p className="text-2xl font-black font-mono text-emerald-600 mt-1">+{metrics.totalInQty}</p>
          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5" /> Inward catalog intake
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Stock Out</p>
          <p className="text-2xl font-black font-mono text-rose-600 mt-1">-{metrics.totalOutQty}</p>
          <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-2">
            <TrendingDown className="w-3.5 h-3.5" /> Outward field dispatches
          </span>
        </div>

        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 text-white shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ledger Status</p>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1.5 flex items-center gap-1.5">
            VERIFIED
          </p>
          <span className="text-[10px] text-slate-300 font-semibold block mt-2">
            Tamper-proof chronological record
          </span>
        </div>
      </div>

      {/* FILTER CONTROL BAR */}
      <form onSubmit={handleApplyFilters} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Box */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Search className="w-3 h-3" /> Keyword Search
            </label>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Txn ID, item, remarks..."
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Date Range */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date Range
            </label>
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 6 Months</option>
              <option>All Time</option>
            </select>
          </div>

          {/* Movement Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Movement Type
            </label>
            <select 
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="All">All Types (IN & OUT)</option>
              <option value="IN">Stock In (+)</option>
              <option value="OUT">Stock Out (-)</option>
            </select>
          </div>

          {/* Item Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Package className="w-3 h-3" /> Filter by Item
            </label>
            <select 
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="All">All Inventory Items</option>
              {items.map(it => (
                <option key={it._id} value={it._id}>
                  {it.itemName} {it.isArchived ? '(Archived)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3" /> Employee
            </label>
            <select 
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="All">All Staff / Technicians</option>
              {technicians.map(t => (
                <option key={t._id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
          <button 
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
          <button 
            type="submit"
            className="px-5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* AUDIT TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs text-slate-500 font-semibold">
          <span>Detailed Movement Transaction Audit Log</span>
          <span>Page {pagination.page} of {pagination.pages} ({pagination.total} records)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100">
                <th className="py-2.5 px-4 text-slate-600 whitespace-nowrap">Transaction ID</th>
                <th className="py-2.5 px-4 text-slate-600 whitespace-nowrap">Date & Time</th>
                <th className="py-2.5 px-4 text-center text-slate-600 whitespace-nowrap">Type</th>
                <th className="py-2.5 px-4 text-slate-600 whitespace-nowrap">Material / Item</th>
                <th className="py-2.5 px-4 text-right text-slate-600 whitespace-nowrap">Quantity</th>
                <th className="py-2.5 px-4 text-center text-slate-600 whitespace-nowrap">Stock Impact (Before → After)</th>
                <th className="py-2.5 px-4 text-slate-600 whitespace-nowrap">Handled By</th>
                <th className="py-2.5 px-4 text-slate-600">Reason / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600 mb-2"></div>
                    <div>Loading audit ledger records...</div>
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((tx) => {
                  const isIn = tx.type === 'IN';
                  const formattedDateTime = formatTransactionDateTime(tx.date, tx.time, tx.createdAt) || `${tx.date} ${tx.time}`;
                  const unit = tx.item?.unit || 'Nos';
                  const displayTxnId = tx.transactionId || `TXN-${tx._id.slice(-8).toUpperCase()}`;

                  return (
                    <tr key={tx._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Transaction ID */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                        {displayTxnId}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {formattedDateTime}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold font-mono tracking-wide ${
                          isIn 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {isIn ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {isIn ? 'STOCK IN' : 'STOCK OUT'}
                        </span>
                      </td>

                      {/* Material / Item */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {tx.item?.itemName || 'Item Unlisted'}
                          {tx.item?.isArchived && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded border border-slate-200 font-normal">
                              Archived
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {tx.item?.sku || tx.item?.category || 'General'}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className={`py-3 px-4 text-right font-bold font-mono whitespace-nowrap ${
                        isIn ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {isIn ? `+${tx.quantity}` : `-${tx.quantity}`} {unit}
                      </td>

                      {/* Before / After Stock Impact */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono text-[10px]">
                        {tx.stockBefore !== undefined && tx.stockAfter !== undefined ? (
                          <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <span className="text-slate-500">{tx.stockBefore}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                            <span className={`font-bold ${isIn ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {tx.stockAfter} {unit}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Handled By */}
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {tx.user || 'System'}
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={tx.remarks}>
                        {tx.remarks || '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                    No matching stock transactions found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {pagination.pages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => {
                  const newPage = pagination.page - 1;
                  setPage(newPage);
                  fetchTransactions(newPage);
                }}
                className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => {
                  const newPage = pagination.page + 1;
                  setPage(newPage);
                  fetchTransactions(newPage);
                }}
                className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
