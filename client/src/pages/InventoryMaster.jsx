import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Boxes, Edit3, AlertTriangle, CheckCircle, Flame, Search, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function InventoryMaster() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchParams] = useSearchParams();

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const selectAllRef = useRef(null);

  // Modal Control States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentItemId, setCurrentItemId] = useState(null);
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    unit: 'Nos',
    currentStock: 0,
    minimumStock: 10,
    description: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync global header search parameter
  const query = searchParams.get('q') || '';
  useEffect(() => {
    setSearchTerm(query);
  }, [query]);

  // Fetch live stock listings directly from server instance
  const fetchInventoryData = async () => {
    try {
      const response = await axios.get('/api/inventory');
      if (response.data.success) {
        setInventory(response.data.data);
      }
    } catch (err) {
      setError('Failed to pull system master items catalogue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Filter & Search Processing pipeline
  const filteredItems = inventory.filter(item => {
    const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'All') return matchesSearch;
    if (filterStatus === 'Critical') return matchesSearch && item.status === 'CRITICAL';
    if (filterStatus === 'Healthy') return matchesSearch && item.status === 'HEALTHY';
    if (filterStatus === 'Out of Stock') return matchesSearch && item.status === 'OUT OF STOCK';
    return matchesSearch;
  });

  // Calculate quick summary metrics for data blocks
  const metrics = {
    totalItems: inventory.length,
    lowStock: inventory.filter(i => i.status === 'CRITICAL').length,
    outOfStock: inventory.filter(i => i.status === 'OUT OF STOCK').length,
    healthyItems: inventory.filter(i => i.status === 'HEALTHY').length
  };

  // Open modal handlers
  const handleOpenAddModal = () => {
    setFormData({
      itemName: '',
      category: '',
      unit: 'Nos',
      currentStock: 0,
      minimumStock: 10,
      description: ''
    });
    setModalMode('add');
    setCurrentItemId(null);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setFormData({
      itemName: item.itemName,
      category: item.category,
      unit: item.unit,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      description: item.description || ''
    });
    setModalMode('edit');
    setCurrentItemId(item._id);
    setFormError('');
    setIsModalOpen(true);
  };

  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every(item => selectedIds.includes(item._id));
  const someFilteredSelected = filteredItems.some(item => selectedIds.includes(item._id)) && !allFilteredSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected;
    }
  }, [someFilteredSelected]);

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredItems.map(i => i._id));
      setSelectedIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      const newSelected = new Set([...selectedIds, ...filteredItems.map(i => i._id)]);
      setSelectedIds(Array.from(newSelected));
    }
  };

  const handleToggleSelectItem = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteItem = async (itemId) => {
    const item = inventory.find(i => i._id === itemId);
    const name = item?.itemName || 'this inventory item';
    if (!window.confirm(`Are you sure you want to delete "${name}"? Historical stock transactions will be safely preserved in the audit log.`)) {
      return;
    }
    try {
      const response = await axios.delete(`/api/inventory/${itemId}`);
      if (response.data.success) {
        setSelectedIds(prev => prev.filter(i => i !== itemId));
        toast.success(response.data.message || 'Item deleted successfully.');
        await fetchInventoryData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete inventory item.');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!window.confirm(`Are you sure you want to delete ${count} selected item${count > 1 ? 's' : ''}? Items with historical transactions will be safely archived to preserve the audit trail.`)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      const res = await axios.post('/api/inventory/batch-delete', { ids: selectedIds });
      if (res.data.success) {
        toast.success(res.data.message || `Deleted ${count} item(s) successfully.`);
        setSelectedIds([]);
        await fetchInventoryData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete selected items.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (modalMode === 'add') {
        const response = await axios.post('/api/inventory', formData);
        if (response.data.success) {
          await fetchInventoryData();
          setIsModalOpen(false);
        }
      } else {
        const response = await axios.put(`/api/inventory/${currentItemId}`, formData);
        if (response.data.success) {
          await fetchInventoryData();
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-12 font-medium text-slate-500 font-sans">Loading master logistics grid...</div>;
  if (error) return <div className="text-rose-600 font-semibold p-4 bg-rose-50 rounded-xl border border-rose-200 font-sans">{error}</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* HEADER CONTROLS ACTION PANEL TRAY */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Master</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Global product listings and real-time safety threshold management.</p>
        </div>
        
        {/* Actions Cluster */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleDeleteSelected}
              disabled={isBulkDeleting}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer animate-fadeIn"
            >
              <Trash2 className="w-3.5 h-3.5" /> 
              {isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
            </button>
          )}
          <button 
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add New Item
          </button>
        </div>
      </div>

      {/* QUICK SUMMARY CARD BANNERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Boxes className="w-5 h-5" /></div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Items</p>
            <p className="text-xl font-extrabold font-mono text-slate-900 mt-0.5">{metrics.totalItems}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5" /></div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Low Stock</p>
            <p className="text-xl font-extrabold font-mono text-slate-900 mt-0.5">{metrics.lowStock}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><Flame className="w-5 h-5" /></div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Out of Stock</p>
            <p className="text-xl font-extrabold font-mono text-slate-900 mt-0.5">{metrics.outOfStock}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><CheckCircle className="w-5 h-5" /></div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Healthy Stock</p>
            <p className="text-xl font-extrabold font-mono text-slate-900 mt-0.5">{metrics.healthyItems}</p>
          </div>
        </div>
      </div>

      {/* DATA CONTROLS FILTERS GRID STRIP */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Healthy', 'Critical', 'Out of Stock'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  filterStatus === status 
                    ? 'bg-white border-slate-300 text-slate-900 shadow-sm' 
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {status} List
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search items, categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-9 pr-4 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* SELECTED ITEMS STATUS BAR */}
        {selectedIds.length > 0 && (
          <div className="px-6 py-2.5 bg-blue-50/90 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900 transition-all">
            <div className="flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block animate-pulse"></span>
              <span>{selectedIds.length} of {inventory.length} item{selectedIds.length > 1 ? 's' : ''} selected</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-white transition-colors cursor-pointer"
              >
                Clear Selection
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={isBulkDeleting}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-md shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                {isBulkDeleting ? 'Deleting...' : `Delete (${selectedIds.length})`}
              </button>
            </div>
          </div>
        )}

        {/* PRIMARY LEDGER SCHEMATIC DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-6 w-4">
                  <input 
                    ref={selectAllRef}
                    type="checkbox" 
                    checked={allFilteredSelected}
                    onChange={handleToggleSelectAll}
                    disabled={filteredItems.length === 0}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                    title="Select All"
                  />
                </th>
                <th className="py-3 px-6 text-slate-600">Item Name</th>
                <th className="py-3 px-6 text-slate-600">Category</th>
                <th className="py-3 px-6 text-slate-600">Unit</th>
                <th className="py-3 px-6 text-right text-slate-600">Current Stock</th>
                <th className="py-3 px-6 text-right text-slate-600">Min. Stock</th>
                <th className="py-3 px-6 text-center text-slate-600">Status</th>
                <th className="py-3 px-6 text-slate-600 max-w-xs">Description</th>
                <th className="py-3 px-6 text-center text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.map((item) => (
                <tr 
                  key={item._id} 
                  className={`transition-colors ${
                    selectedIds.includes(item._id) 
                      ? 'bg-blue-50/50 hover:bg-blue-50/80' 
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="py-3 px-6">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(item._id)}
                      onChange={() => handleToggleSelectItem(item._id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                    />
                  </td>
                  <td className="py-3 px-6 font-bold text-slate-900">{item.itemName}</td>
                  <td className="py-3 px-6 font-medium text-slate-500">{item.category}</td>
                  <td className="py-3 px-6 font-medium text-slate-400 font-mono">{item.unit}</td>
                  <td className={`py-3 px-6 text-right font-bold font-mono ${
                    item.status === 'CRITICAL' ? 'text-rose-600' : 'text-slate-800'
                  }`}>
                    {item.currentStock.toLocaleString()}
                  </td>
                  <td className="py-3 px-6 text-right font-medium text-slate-400 font-mono">{item.minimumStock}</td>
                  <td className="py-3 px-6 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono tracking-wide ${
                      item.status === 'HEALTHY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      item.status === 'CRITICAL' ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-slate-500 truncate max-w-xs">{item.description}</td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item._id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-slate-400 font-medium">No matching items filtered inside current view pipeline.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <h3 className="text-sm font-bold text-slate-900">
                {modalMode === 'add' ? 'Add New Catalog Item' : 'Edit Inventory Item'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold transition-all cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border-l-4 border-rose-500 rounded-lg text-xs text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.itemName}
                    onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                    placeholder="e.g. PLC Splitter 1x16"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                    placeholder="e.g. Distribution"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Unit *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                    placeholder="e.g. Units, Meters"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Current Stock *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    disabled={modalMode === 'edit'}
                    value={formData.currentStock}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentStock: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-60 text-slate-800"
                  />
                  {modalMode === 'edit' && (
                    <span className="text-[9px] text-slate-400 mt-1 block">Adjust stock level via Stock In/Out entries.</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Minimum Threshold *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.minimumStock}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimumStock: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none text-slate-800"
                    placeholder="Provide details about this material node..."
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
