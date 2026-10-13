import React, { useState, useEffect } from 'react';
import { FileText, FileSpreadsheet, Printer, Calendar, User, Layers, ShieldCheck, TrendingUp, Download, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getLocalDateString } from '../utils/dateUtils';

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');
  const [technicians, setTechnicians] = useState([]);

  // Filter states
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [employeeFilter, setEmployeeFilter] = useState('All Employees');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  const getDateParams = () => {
    let startDate = '';
    const now = new Date();
    const todayStr = getLocalDateString(now);

    if (dateRange === 'Last 24 Hours') {
      startDate = getLocalDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    } else if (dateRange === 'Last 7 Days') {
      startDate = getLocalDateString(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    } else if (dateRange === 'Last 30 Days') {
      startDate = getLocalDateString(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    } else if (dateRange === 'Last 6 Months') {
      startDate = getLocalDateString(new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000));
    }

    return { startDate, endDate: todayStr };
  };

  const fetchReport = (showLoader = true) => {
    if (showLoader) setLoading(true);
    const { startDate, endDate } = getDateParams();

    axios.get('/api/reports/summary', {
      params: {
        startDate,
        endDate,
        employee: employeeFilter,
        category: categoryFilter
      }
    })
      .then(res => {
        if (res.data.success) setSummary(res.data.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load report data');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReport();
    axios.get('/api/technicians')
      .then(res => {
        const list = res.data.data || [];
        setTechnicians(list.filter(t => t.active !== false));
      })
      .catch(() => {});
  }, []);

  const handleApplyFilters = () => {
    fetchReport(true);
  };

  // Fixed: Use axios blob download instead of window.open (which doesn't send JWT token)
  const downloadFile = async (type) => {
    setDownloading(type);
    try {
      const { startDate, endDate } = getDateParams();
      const endpoint = type === 'pdf' ? 'pdf' : 'excel';
      
      const response = await axios.get(`/api/reports/${endpoint}`, {
        params: {
          startDate,
          endDate,
          employee: employeeFilter,
          category: categoryFilter
        },
        responseType: 'blob'
      });

      // Create download link from blob
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = type === 'pdf' 
        ? 'vlink_material_usage_report.pdf' 
        : 'vlink_material_usage_report.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${type.toUpperCase()} report downloaded successfully!`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error(`Failed to download ${type.toUpperCase()} report. Please try again.`);
    } finally {
      setDownloading('');
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500 font-medium font-sans">Assembling audit intelligence structures...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* ACTION TOP BANNER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Actionable Reports</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Analyze and export telecom material movements and employee performance metrics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => window.print()} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm cursor-pointer">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button 
            onClick={() => downloadFile('excel')} 
            disabled={downloading === 'excel'}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} 
            {downloading === 'excel' ? 'Exporting...' : 'Excel'}
          </button>
          <button 
            onClick={() => downloadFile('pdf')} 
            disabled={downloading === 'pdf'}
            className="px-4 py-2 bg-[#1d4ed8] hover:bg-blue-700 text-white rounded-lg text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
            {downloading === 'pdf' ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* FILTER STICK STRIP CONTROL ENGINE */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date Range</label>
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option>Last 24 Hours</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last 6 Months</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><User className="w-3 h-3" /> Employee Filter</label>
          <select 
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option>All Employees</option>
            {technicians.map(t => (
              <option key={t._id} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Layers className="w-3 h-3" /> Item Category</label>
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option>All Categories</option>
            <option>Terminal Equipment</option>
            <option>Connectivity</option>
            <option>Distribution</option>
            <option>Infrastructure</option>
            <option>Passive Gear</option>
          </select>
        </div>
        <button 
          onClick={handleApplyFilters}
          className="w-full bg-blue-50 hover:bg-blue-100 text-[#1d4ed8] text-xs font-bold py-2 px-4 rounded-lg border border-blue-200 transition-all cursor-pointer"
        >
          Apply Context Filters
        </button>
      </div>

      {/* COMPACT ANALYTICAL DATA METRIC BLOCKS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Movements</p>
          <p className="text-2xl font-black font-mono text-slate-900 mt-1">{summary?.totalMovements || 0}</p>
          <span className="text-[10px] text-slate-500 font-semibold block mt-2">
            Audit Ledger Transactions
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Units Dispatched</p>
          <p className="text-2xl font-black font-mono text-slate-900 mt-1">{(summary?.totalUnitsDispatched ?? summary?.inventoryValueOut ?? 0).toLocaleString()}</p>
          <span className="text-[10px] text-slate-400 font-medium block mt-2">Total Outward Stock Units</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Critical Stock Alerts</p>
          <p className="text-2xl font-black font-mono text-rose-600 mt-1">{String(summary?.criticalAlerts || 0).padStart(2, '0')}</p>
          <span className="text-[10px] text-rose-500 font-semibold block mt-2">⚠️ Threshold Action Needed</span>
        </div>
        <div className="bg-[#2563eb] border border-blue-600 rounded-xl p-5 text-white shadow-md relative overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Catalog Rows</p>
          <p className="text-2xl font-black font-mono mt-1">{summary?.rows?.length || 0}</p>
          <span className="text-[10px] text-blue-100 font-semibold flex items-center gap-1 mt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Live Audit Verified
          </span>
        </div>
      </div>

      {/* AGGREGATED DISPLAY DATA TABLE LEDGER GRID */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs text-slate-500 font-semibold">
          <span>Aggregated Material Usage Report</span>
          <span>Showing Live Pipeline Compilations</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100">
                <th className="py-2.5 px-4 text-slate-600 whitespace-nowrap">Item Code (SKU)</th>
                <th className="py-2.5 px-4 text-slate-600 whitespace-nowrap">Product Description</th>
                <th className="py-2.5 px-4 text-right text-slate-600 whitespace-nowrap">Qty In</th>
                <th className="py-2.5 px-4 text-center text-slate-600 whitespace-nowrap">Last Stock In Date</th>
                <th className="py-2.5 px-4 text-right text-slate-600 whitespace-nowrap">Qty Out</th>
                <th className="py-2.5 px-4 text-center text-slate-600 whitespace-nowrap">Last Stock Out Date</th>
                <th className="py-2.5 px-4 text-right text-slate-600 whitespace-nowrap">Net Change</th>
                <th className="py-2.5 px-4 text-slate-600 whitespace-nowrap">Last Employee</th>
                <th className="py-2.5 px-4 text-center text-slate-600 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {summary?.rows && summary.rows.length > 0 ? (
                summary.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-blue-600 whitespace-nowrap">{row.sku}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">{row.itemName}</td>
                    <td className="py-3 px-4 text-right text-slate-500 font-mono whitespace-nowrap">{row.qtyIn}</td>
                    <td className="py-3 px-4 text-center font-medium text-emerald-700 font-mono text-[11px] whitespace-nowrap">
                      {row.lastStockInDate || '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600 font-bold font-mono whitespace-nowrap">{row.qtyOut}</td>
                    <td className="py-3 px-4 text-center font-medium text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {row.lastStockOutDate || '—'}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold font-mono whitespace-nowrap ${
                      row.netChange.startsWith('+') ? 'text-emerald-600' : 'text-slate-700'
                    }`}>{row.netChange}</td>
                    <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">{row.lastEmployee}</td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold font-mono tracking-wide ${
                        row.status === 'OPTIMAL' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                        row.status === 'LOW STOCK' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        'bg-rose-50 border-rose-200 text-rose-700'
                      }`}>{row.status}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400 font-medium">
                    No matching movements filtered inside current view pipeline.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
