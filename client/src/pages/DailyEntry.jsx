import React, { useState, useEffect } from 'react';
import { ClipboardList, Check, X, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getLocalDateString, getLocalTimeString } from '../utils/dateUtils';

const DailyEntry = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states initialized immediately with local date/time
  const [date, setDate] = useState(getLocalDateString);
  const [time, setTime] = useState(getLocalTimeString);
  const [careOf, setCareOf] = useState('Select Technician');
  const [quality, setQuality] = useState('GOOD');
  const [remarks, setRemarks] = useState('');
  const [quantities, setQuantities] = useState({}); // item_id -> quantity

  // Technicians loaded from database
  const [technicians, setTechnicians] = useState([]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/inventory');
      const itemsList = res.data.data || res.data || [];
      setItems(itemsList);

      // Pre-set input quantities to 0
      const initialQuants = {};
      itemsList.forEach(item => {
        initialQuants[item._id] = '';
      });
      setQuantities(initialQuants);
    } catch (err) {
      console.error('Failed to fetch catalog items', err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchItems();

    // Fetch technicians from database
    const fetchTechnicians = async () => {
      try {
        const res = await axios.get('/api/technicians');
        const techList = res.data.data || [];
        setTechnicians(techList.filter(t => t.active !== false));
      } catch (err) {
        console.error('Failed to fetch technicians', err);
      }
    };
    fetchTechnicians();

    // Set current local date & time as default
    setDate(getLocalDateString());
    setTime(getLocalTimeString());
  }, []);

  const handleQtyChange = (itemId, val) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: val
    }));
  };

  const handleClear = () => {
    const cleared = {};
    items.forEach(item => {
      cleared[item._id] = '';
    });
    setQuantities(cleared);
    setCareOf('Select Technician');
    setRemarks('');
    setQuality('GOOD');
    setDate(getLocalDateString());
    setTime(getLocalTimeString());
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSuccess('');

    if (careOf === 'Select Technician') {
      setError('Please select a technician for Care Of');
      return;
    }

    // Map item names to schema object keys
    const nameToKeyMap = {
      'Home Node': 'homeNode',
      'Patch Code': 'patchCode',
      'Tie Wire': 'tieWire',
      'PLC 1×4': 'plc1x4',
      'PLC 1x4': 'plc1x4',
      'PLC 1×8': 'plc1x8',
      'PLC 1x8': 'plc1x8',
      'STB': 'stb',
      'Modem': 'modem',
      'Cable': 'cable'
    };

    const payloadMaterials = {
      homeNode: 0,
      patchCode: 0,
      tieWire: 0,
      plc1x4: 0,
      plc1x8: 0,
      stb: 0,
      modem: 0,
      cable: 0
    };

    let hasQuantities = false;
    items.forEach(item => {
      const qty = Number(quantities[item._id] || 0);
      if (qty > 0) {
        const key = nameToKeyMap[item.itemName];
        if (key) {
          payloadMaterials[key] = qty;
          hasQuantities = true;
        }
      }
    });

    if (!hasQuantities) {
      setError('Please enter at least one material quantity to dispatch');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post('/api/daily-entries', {
        date,
        time,
        careOf,
        quality,
        remarks,
        materials: payloadMaterials
      });

      setSuccess('Daily Entry submitted successfully! Stock has been auto-deducted.');
      toast.success('Daily Entry submitted! Stock auto-deducted.');
      handleClear();
      fetchItems(); // reload items to get updated stock levels
    } catch (err) {
      const msg = err.response?.data?.message || 'Transaction aborted. Check stock availability.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#F3F4F6] p-4 md:p-8 select-none font-sans">
      {/* Title Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 leading-tight">Daily Dispatch & Stock Entry</h2>
        {/* Info Banner */}
        <div className="mt-3 bg-[#E6F4EA] text-[#137333] border border-[#A3CFEC]/0 text-xs font-semibold px-4 py-3 rounded-lg flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Submitting this form will automatically calculate and deduct items from live inventory.
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg text-sm text-red-700 font-medium mb-6">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg text-sm text-green-700 font-medium mb-6">
          ✓ {success}
        </div>
      )}

      {/* Columns Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Metadata */}
        <div className="col-span-1 lg:col-span-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            📝 Meta Data
          </span>

          {/* Date & Time */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Date & Time
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-[#F9FAFB] border border-gray-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full bg-[#F9FAFB] border border-gray-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Care Of dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Care Of (Technician)
            </label>
            <select
              value={careOf}
              onChange={(e) => setCareOf(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-gray-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Select Technician">Select Technician</option>
              {technicians.map((t) => (
                <option key={t._id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Quality Toggles */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Quality Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setQuality('GOOD')}
                className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${quality === 'GOOD'
                  ? 'bg-[#E6F4EA] border-[#137333] text-[#137333]'
                  : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                  }`}
              >
                <Check className="h-3.5 w-3.5" />
                GOOD
              </button>
              <button
                type="button"
                onClick={() => setQuality('FAULTY')}
                className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${quality === 'FAULTY'
                  ? 'bg-[#FCE8E6] border-[#C5221F] text-[#C5221F]'
                  : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                  }`}
              >
                <X className="h-3.5 w-3.5" />
                FAULTY
              </button>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Remarks
            </label>
            <textarea
              rows="4"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Mention site code or special notes..."
              className="w-full bg-[#F9FAFB] border border-gray-200 rounded-lg text-xs p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            ></textarea>
          </div>
        </div>

        {/* Right Column: Entry Grid */}
        <div className="col-span-1 lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between min-h-[350px]">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  ⚡ Rapid Entry Grid
                </span>
                <span className="text-[10px] text-gray-400 font-bold">Units: Pcs / Meters</span>
              </div>

              {/* Grid of items */}
              {loading ? (
                <div className="py-12 text-center text-xs text-gray-400">Loading catalog stock...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {items.map((item) => (
                    <div key={item._id} className="flex flex-col gap-1 border border-gray-50 p-3 rounded-lg bg-gray-50/20">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-bold text-gray-800 truncate" title={item.itemName}>{item.itemName}</span>
                        <span className="text-[10px] text-gray-400 font-bold">Stock: {item.currentStock}</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={quantities[item._id] || ''}
                        onChange={(e) => handleQtyChange(item._id, e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 mt-8 border-t border-gray-50 pt-4">
              <button
                type="button"
                onClick={handleClear}
                className="py-2.5 px-6 border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Clear Form
              </button>

              <button
                type="submit"
                disabled={submitting}
                className={`py-2.5 px-6 font-bold text-xs rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-md shadow-blue-100 ${
                  submitting ? 'bg-blue-400 cursor-not-allowed text-white' : 'bg-[#1D4ED8] hover:bg-blue-700 text-white'
                }`}
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'Submitting...' : 'Submit Entry'}
              </button>
            </div>
          </div>

          {/* Inventory Health Panel */}
          {(() => {
            const totalItemsCount = items.length;
            const healthyCount = items.filter(i => (i.currentStock || 0) > (i.minimumStock || 0)).length;
            const healthRate = totalItemsCount > 0 ? Math.round((healthyCount / totalItemsCount) * 100) : 100;
            const totalStockUnits = items.reduce((sum, i) => sum + (i.currentStock || 0), 0);

            return (
              <div className="bg-[#111827] text-white p-6 rounded-xl border border-gray-800 shadow-sm relative overflow-hidden flex items-center justify-between">
                <div className="flex items-center gap-12">
                  <div>
                    <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest">Inventory Health</span>
                    <span className="block text-2xl font-extrabold mt-1 text-white">{healthRate}%</span>
                    <span className="block text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Catalog Health Rate</span>
                  </div>
                  <div className="h-10 w-px bg-gray-800"></div>
                  <div>
                    <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest">&nbsp;</span>
                    <span className="block text-2xl font-extrabold mt-1 text-white">{totalStockUnits.toLocaleString()}</span>
                    <span className="block text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Total Units in Stock</span>
                  </div>
                </div>
                {/* Clipboard background icon */}
                <div className="absolute right-6 opacity-5 select-none pointer-events-none">
                  <ClipboardList className="h-24 w-24 text-white" />
                </div>
              </div>
            );
          })()}
        </div>
      </form>
    </div>
  );
};

export default DailyEntry;
