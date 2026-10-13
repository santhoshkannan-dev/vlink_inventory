import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ArrowUpRight, FileSpreadsheet } from 'lucide-react';
import axios from 'axios';
import { getLocalDateString, getLocalTimeString } from '../utils/dateUtils';

export default function StockOut() {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states initialized immediately with local date/time
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [employee, setEmployee] = useState('');
  const [careOf, setCareOf] = useState('');
  const [purpose, setPurpose] = useState('');
  const [remarks, setRemarks] = useState('');
  const [date, setDate] = useState(getLocalDateString);
  const [time, setTime] = useState(getLocalTimeString);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await axios.get('/api/inventory');
        if (response.data.success) {
          setItems(response.data.data);
        }
      } catch (err) {
        setError('Failed to fetch inventory catalog.');
      } finally {
        setLoading(false);
      }
    };
    fetchItems();

    // Default local date/time
    setDate(getLocalDateString());
    setTime(getLocalTimeString());
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSuccess('');

    if (!itemId) {
      setError('Please select an item to issue.');
      return;
    }

    const numQty = Number(quantity);
    if (!numQty || numQty <= 0) {
      setError('Please enter a valid quantity greater than 0.');
      return;
    }

    // Find the item to check stock levels
    const selectedItem = items.find(i => i._id === itemId);
    if (selectedItem && selectedItem.currentStock < numQty) {
      setError(`Insufficient stock. Only ${selectedItem.currentStock} ${selectedItem.unit} available.`);
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post('/api/inventory/stock-out', {
        itemId,
        quantity: numQty,
        employee: employee || user?.name || 'Staff',
        careOf,
        purpose,
        date,
        time,
        remarks
      });

      if (response.data.success) {
        setSuccess(`Successfully logged stock issuance! ${numQty} units deducted.`);
        // Reset form
        setItemId('');
        setQuantity('');
        setEmployee('');
        setCareOf('');
        setPurpose('');
        setRemarks('');
        setDate(getLocalDateString());
        setTime(getLocalTimeString());
        // Refresh catalog quantities
        const refreshRes = await axios.get('/api/inventory');
        if (refreshRes.data.success) {
          setItems(refreshRes.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process stock deduction.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500 font-sans">Loading stock options...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Manual Stock Out</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Register stock issuance, team distributions, and deduct items from warehouse catalog.</p>
      </div>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-lg text-xs font-semibold text-rose-700">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-lg text-xs font-semibold text-emerald-700">
          ✓ {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
          <ArrowUpRight className="w-4 h-4 text-rose-600" />
          Issuance Specifications
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Catalog Item</label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2.5 font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="">-- Choose Item --</option>
              {items.map(i => (
                <option key={i._id} value={i._id}>{i.itemName} ({i.unit}) - Stock: {i.currentStock}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Quantity Deducting</label>
            <input
              type="number"
              required
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 50"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Employee / Authorized Person</label>
            <input
              type="text"
              required
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              placeholder="e.g. David Miller"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Care Of / Handed Over To</label>
            <input
              type="text"
              required
              value={careOf}
              onChange={(e) => setCareOf(e.target.value)}
              placeholder="e.g. Technician Team C"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deployment Purpose</label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Outer ring node expansion"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Issue Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-[11px] px-2 py-2 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Issue Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-[11px] px-2 py-2 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Remarks / Details</label>
          <textarea
            rows="3"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Log comments about item condition, logistics notes, etc."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs p-3 focus:outline-none focus:border-blue-500 focus:bg-white"
          ></textarea>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={submitting}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
              submitting
                ? 'bg-rose-400 cursor-not-allowed text-white shadow-none'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {submitting ? 'Deducting Stock...' : 'Commit Stock Out'}
          </button>
        </div>
      </form>
    </div>
  );
}
