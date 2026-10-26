/**
 * pages/ConfirmationPage.jsx
 * ==========================
 * Shows reservation confirmation with PDF download option.
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle, Download, Home, Building2, Layers,
  Users, Calendar, Hash, User
} from 'lucide-react';
import { getReservation } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-700/30 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-cyan-400" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

export default function ConfirmationPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const receiptRef = useRef(null);

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    getReservation(id)
      .then(setData)
      .catch(() => setError('Reservation not found. Please check your reservation ID.'))
      .finally(() => setLoading(false));
  }, [id]);

  const downloadPDF = async () => {
    try {
      const jsPDF  = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      const canvas  = await html2canvas(receiptRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgW    = 190;
      const imgH    = (canvas.height * imgW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgW, imgH);
      pdf.save(`Hostel-Reservation-${data.reservation_id}.pdf`);
    } catch (e) {
      console.error('PDF generation failed:', e);
      alert('PDF generation failed. Please try again.');
    }
  };

  if (loading) return <div className="page-container"><LoadingSpinner message="Loading confirmation..." /></div>;
  if (error)   return (
    <div className="page-container max-w-md mx-auto text-center py-20">
      <p className="text-3xl mb-3">❌</p>
      <p className="text-red-400 font-medium mb-2">{error}</p>
      <button onClick={() => navigate('/')} className="btn-secondary mt-4">← Home</button>
    </div>
  );
  if (!data) return null;

  return (
    <div className="page-container max-w-xl">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle size={40} className="text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Reservation Confirmed!</h1>
        <p className="text-slate-400">Your hostel room has been successfully reserved.</p>
      </div>

      {/* Receipt */}
      <div ref={receiptRef} className="card p-6 mb-6">
        {/* Reservation ID banner */}
        <div className="bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 rounded-xl p-4 mb-6 text-center">
          <p className="text-xs text-slate-400 mb-1">Reservation ID</p>
          <p className="text-xl font-bold text-cyan-400 font-mono tracking-widest">{data.reservation_id}</p>
          <p className="text-xs text-slate-500 mt-1">Keep this for your records</p>
        </div>

        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Room Details</h3>
        <Detail icon={Hash}      label="Room ID"    value={data.room_id} />
        <Detail icon={Building2} label="Block"      value={data.block === 'AC' ? 'AC Block (Air Conditioned)' : 'Non-AC Block'} />
        <Detail icon={Layers}    label="Floor"      value={`Floor ${data.floor}`} />
        <Detail icon={Users}     label="Room Type"  value={data.room_type} />
        <Detail icon={Users}     label="Capacity"   value={`${data.capacity} people`} />

        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2 mt-5">Student Details</h3>
        <Detail icon={User}     label="Full Name"      value={data.full_name} />
        <Detail icon={Hash}     label="Roll Number"    value={data.roll_number} />
        <Detail icon={Building2}label="Department"     value={data.department} />
        <Detail icon={Users}    label="Academic Year"  value={data.academic_year} />

        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2 mt-5">Reservation Details</h3>
        <Detail icon={Calendar} label="Date & Time"    value={formatDate(data.reserved_at)} />
        <Detail icon={CheckCircle} label="Status"      value={data.res_status === 'ACTIVE' ? '✅ Active' : data.res_status} />

        {/* No payment info */}
        <div className="mt-5 bg-slate-800/60 rounded-xl p-3 text-center text-xs text-slate-500">
          This is a room booking confirmation only. No payment has been processed.
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => navigate('/')} className="btn-secondary flex-1 flex items-center justify-center gap-2">
          <Home size={16} /> Home
        </button>
        <button onClick={downloadPDF} className="btn-primary flex-1 flex items-center justify-center gap-2">
          <Download size={16} /> Download PDF
        </button>
      </div>

      {/* Lookup hint */}
      <p className="text-center text-xs text-slate-500 mt-4">
        To look up this reservation later, go to{' '}
        <button onClick={() => navigate('/lookup')} className="text-cyan-400 hover:underline">
          My Booking
        </button>{' '}
        and enter your reservation ID and roll number.
      </p>
    </div>
  );
}
