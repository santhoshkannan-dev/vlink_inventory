import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Boxes, ClipboardEdit, AlertTriangle, TrendingUp, BellRing, ArrowUpRight, ArrowDownLeft, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Inventory state for dashboard display
  const [inventory, setInventory] = useState([]);
  const [inventorySearch, setInventorySearch] = useState('');

  // 1. Fetch aggregated analytical data properties
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await axios.get('/api/dashboard/stats');
        if (response.data.success) {
          setStats(response.data.data);
        }
      } catch (err) {
        setError('Failed to refresh analytics telemetry dashboard streams.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, []);

  // 2. Fetch inventory catalog list for staff dashboard display
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await axios.get('/api/inventory');
        if (res.data.success) {
          setInventory(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch catalog list', err);
      }
    };
    fetchInventory();
  }, []);

  // Chart data (to be wired to a real endpoint in the future)
  const chartData = [];

  // Filter items in catalog search
  const filteredInventory = inventory.filter(item => 
    item.itemName.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    item.category.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  if (loading) return <div className="text-center py-12 font-medium text-slate-500 font-sans">Refreshing operational workspace boards...</div>;
  if (error) return <div className="text-rose-600 font-semibold p-4 bg-rose-50 rounded-xl border border-rose-200 font-sans">{error}</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* HEADER BLOCK BRAND CONTEXT */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time telecommunications stock and material flow analytics.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 shadow-sm">
          <span>📅 Last 24 Hours</span>
        </div>
      </div>

      {/* COMPACT STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* TOTAL STOCK AVAILABLE CARD */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Stock Available</p>
              <p className="text-2xl font-black font-mono text-slate-900 mt-1">{stats.totalStock.toLocaleString()}</p>
              <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-2">
                <Boxes className="w-3 h-3 text-blue-500" /> Live warehouse count
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600"><Boxes className="w-5 h-5" /></div>
          </div>
        </div>

        {/* TODAY'S ENTRIES CARD */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Today's Entries</p>
              <p className="text-2xl font-black font-mono text-slate-900 mt-1">{stats.todayEntriesCount}</p>
              <span className="text-[10px] text-slate-400 font-semibold block mt-2">Logs generated today</span>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600"><ClipboardEdit className="w-5 h-5" /></div>
          </div>
        </div>

        {/* LOW STOCK ITEMS WARNING CARD */}
        <div className={`border rounded-xl p-5 relative overflow-hidden shadow-sm transition-all ${
          stats.lowStockCount > 0 ? 'bg-rose-50/40 border-rose-200 ring-1 ring-rose-500/5' : 'bg-white border-slate-200'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Low Stock Items</p>
              <p className={`text-2xl font-black font-mono mt-1 ${stats.lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {stats.lowStockCount}
              </p>
              <span className="mt-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase bg-rose-600 text-white">
                CRITICAL ALERT
              </span>
            </div>
            <div className={`p-2.5 rounded-lg ${stats.lowStockCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* TODAY'S MATERIAL USAGE CARD */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Today's Material Usage</p>
              <p className="text-2xl font-black font-mono text-slate-900 mt-1">{stats.todayUsage.toLocaleString()}</p>
              <span className="text-[10px] text-slate-400 font-semibold block mt-2">Units deployed outward</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600"><LayoutDashboard className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS UTILITY STRIP CONTAINER */}
      {stats.lowStockCount > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 px-4 flex items-center justify-between text-xs text-amber-800 font-medium">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-4 h-4 text-amber-600 shrink-0" />
            <span>⚠️ <strong>Low Stock Threshold Breached</strong>. Stock counts are below safety bounds.</span>
          </div>
          <button onClick={() => navigate('/inventory')} className="text-blue-600 font-bold hover:underline cursor-pointer bg-transparent border-none">View All Alerts</button>
        </div>
      )}

      {/* LOWER DATA FRAME SPLIT: ANALYTICS VS LEDGER */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* RECHARTS DATA VISUALIZATION BLOCK */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between min-w-0">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800">Monthly Material Usage</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Overview of logistics metrics across current period.</p>
          </div>
          <div className="h-64 w-full text-xs font-mono min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend iconType="circle" />
                <Bar dataKey="Home Nodes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Fiber Cables" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AUDIT LOG TRANSACTION LEDGER FEED */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Recent Activity Log</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Real-time unalterable network deployment and audit flows.</p>
            </div>
            <button onClick={() => navigate('/reports')} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer bg-transparent border-none">View Full Log</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100">
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3 text-center">Type</th>
                  <th className="py-2 px-3 text-right">Qty</th>
                  <th className="py-2 px-3">User</th>
                  <th className="py-2 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {stats.recentActivity.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-800">{log.item?.itemName || 'Unknown Item'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wide border ${
                        log.type === 'IN' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                      }`}>
                        {log.type === 'IN' ? <ArrowDownLeft className="w-2.5 h-2.5" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
                        {log.type}
                      </span>
                    </td>
                    <td className={`py-3 px-3 text-right font-bold font-mono ${log.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {log.type === 'IN' ? '+' : '-'}{log.quantity}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-600">{log.user}</td>
                    <td className="py-3 px-3 text-right text-slate-400 font-mono">{log.date} {log.time}</td>
                  </tr>
                ))}
                {stats.recentActivity.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-slate-400 font-medium">No recent operations logs registered.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ACTIVE MATERIALS & PROJECTS CATALOG SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Active Telecom Projects & Materials Catalog</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Real-time catalog representing active stock levels and thresholds.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search catalog..."
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-9 pr-4 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100">
                <th className="py-2 px-3 text-slate-600">Material Name</th>
                <th className="py-2 px-3 text-slate-600">Category</th>
                <th className="py-2 px-3 text-slate-600">Unit</th>
                <th className="py-2 px-3 text-right text-slate-600">Available Stock</th>
                <th className="py-2 px-3 text-right text-slate-600">Safety Limit</th>
                <th className="py-2 px-3 text-center text-slate-600">Current Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filteredInventory.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-800">{item.itemName}</td>
                  <td className="py-3 px-3 font-medium text-slate-500">{item.category}</td>
                  <td className="py-3 px-3 font-medium text-slate-400 font-mono">{item.unit}</td>
                  <td className={`py-3 px-3 text-right font-bold font-mono ${
                    item.status === 'CRITICAL' ? 'text-rose-600' : 'text-slate-800'
                  }`}>
                    {item.currentStock.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-400 font-mono">{item.minimumStock}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold font-mono tracking-wide ${
                      item.status === 'HEALTHY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      item.status === 'CRITICAL' ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-slate-400 font-medium">No projects or materials found in the catalog.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
