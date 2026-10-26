/**
 * pages/RoomDetailPage.jsx
 * ========================
 * Room detail view + multi-step reservation form.
 * Steps: 1 Room info → 2 Student details → 3 Review → 4 Success
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2, Layers, Users, CheckCircle, ChevronLeft,
  AlertCircle, Lock, User
} from 'lucide-react';
import { getRoom, createReservation } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/LoadingSpinner';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Biotechnology',
  'Physics',
  'Mathematics',
  'Other',
];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const emptyForm = {
  full_name    : '',
  roll_number  : '',
  email        : '',
  mobile       : '',
  department   : '',
  academic_year: '',
};

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{msg}</p>;
}

function validateForm(form) {
  const e = {};
  if (!form.full_name.trim()) e.full_name = 'Full name is required.';
  else if (form.full_name.trim().length < 2) e.full_name = 'Name must be at least 2 characters.';
  else if (!/^[a-zA-Z\s.'-]+$/.test(form.full_name.trim())) e.full_name = 'Name contains invalid characters.';

  if (!form.roll_number.trim()) e.roll_number = 'Roll number is required.';
  else if (!/^[A-Za-z0-9/-]{4,20}$/.test(form.roll_number.trim())) e.roll_number = 'Invalid roll number format (4-20 alphanumeric).';

  if (!form.email.trim()) e.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = 'Enter a valid email address.';

  if (!form.mobile.trim()) e.mobile = 'Mobile number is required.';
  else if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) e.mobile = 'Enter a valid 10-digit Indian mobile number.';

  if (!form.department) e.department = 'Department is required.';
  if (!form.academic_year) e.academic_year = 'Academic year is required.';

  return e;
}

export default function RoomDetailPage() {
  const { roomId } = useParams();
  const navigate   = useNavigate();

  const [room,       setRoom]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [roomError,  setRoomError]  = useState('');
  const [step,       setStep]       = useState(1); // 1=info, 2=form, 3=review
  const [form,       setForm]       = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError,setSubmitError]= useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getRoom(roomId);
        if (active) setRoom(data);
      } catch {
        if (active) setRoomError('Room not found or failed to load.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [roomId]);

  const handleFormChange = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    if (formErrors[key]) setFormErrors(prev => ({ ...prev, [key]: '' }));
  };

  const goToReview = () => {
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setStep(3);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        ...form,
        full_name   : form.full_name.trim(),
        roll_number : form.roll_number.trim().toUpperCase(),
        email       : form.email.trim().toLowerCase(),
        mobile      : form.mobile.trim(),
        room_id     : room.room_id,
      };
      const data = await createReservation(payload);
      navigate(`/confirmation/${data.reservation_id}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Reservation failed. Please try again.';
      setSubmitError(msg);
      // If room just got taken, go back to rooms
      if (err.response?.status === 409 && msg.includes('another student')) {
        setStep(1);
        setRoom(prev => prev ? { ...prev, status: 'RESERVED' } : prev);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-container"><LoadingSpinner message="Loading room details..." /></div>;
  if (roomError) return <div className="page-container"><ErrorMessage error={roomError} onRetry={() => window.location.reload()} /></div>;
  if (!room) return null;

  const isReserved = room.status === 'RESERVED';

  return (
    <div className="page-container max-w-2xl">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 text-sm transition-colors">
        <ChevronLeft size={16} /> Back
      </button>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: 'Room Details' },
          { n: 2, label: 'Your Details' },
          { n: 3, label: 'Review' },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all
              ${step === n ? 'bg-cyan-500 border-cyan-500 text-white' :
                step > n  ? 'bg-emerald-500 border-emerald-500 text-white' :
                             'bg-slate-800 border-slate-600 text-slate-500'}`}>
              {step > n ? <CheckCircle size={14} /> : n}
            </div>
            <span className={`text-sm hidden sm:block ${step === n ? 'text-cyan-400 font-medium' : 'text-slate-500'}`}>{label}</span>
            {n < 3 && <div className={`flex-1 h-px w-6 sm:w-12 ${step > n ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Room info ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-2xl font-bold text-white">{room.room_id}</h1>
              <span className={isReserved ? 'badge-reserved' : 'badge-available'}>
                {isReserved ? <Lock size={12}/> : <CheckCircle size={12}/>}
                {isReserved ? 'Reserved' : 'Available'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { icon: Building2, label: 'Block',   value: room.block === 'AC' ? 'AC Block' : 'Non-AC Block' },
                { icon: Layers,    label: 'Floor',   value: `Floor ${room.floor}` },
                { icon: Users,     label: 'Type',    value: room.room_type },
                { icon: Users,     label: 'Capacity',value: `${room.capacity} people` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-slate-800/60 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Icon size={13} />{label}
                  </div>
                  <p className="font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            {isReserved ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                <Lock size={24} className="mx-auto text-red-400 mb-2" />
                <p className="text-red-400 font-medium">This room has been reserved</p>
                <p className="text-slate-400 text-sm mt-1">Please select another available room.</p>
                <button className="btn-secondary text-sm mt-4" onClick={() => navigate('/rooms')}>
                  Browse Available Rooms
                </button>
              </div>
            ) : (
              <button onClick={() => setStep(2)} className="btn-primary w-full text-base py-3">
                Reserve This Room →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: Student form ── */}
      {step === 2 && (
        <div className="card p-6 space-y-5">
          <h2 className="text-xl font-bold text-white">Student Details</h2>
          <p className="text-slate-400 text-sm -mt-2">
            Reserving: <span className="text-cyan-400 font-medium">{room.room_id}</span> ·{' '}
            {room.block} Block · Floor {room.floor} · {room.room_type}
          </p>

          {/* Full name */}
          <div>
            <label className="label">Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Rahul Kumar Sharma"
              value={form.full_name}
              onChange={e => handleFormChange('full_name', e.target.value)}
              className="input-field"
            />
            <FieldError msg={formErrors.full_name} />
          </div>

          {/* Roll number */}
          <div>
            <label className="label">College Roll Number *</label>
            <input
              type="text"
              placeholder="e.g. 21CS001"
              value={form.roll_number}
              onChange={e => handleFormChange('roll_number', e.target.value)}
              className="input-field"
            />
            <FieldError msg={formErrors.roll_number} />
          </div>

          {/* Email */}
          <div>
            <label className="label">College Email Address *</label>
            <input
              type="email"
              placeholder="e.g. rahul@college.edu.in"
              value={form.email}
              onChange={e => handleFormChange('email', e.target.value)}
              className="input-field"
            />
            <FieldError msg={formErrors.email} />
          </div>

          {/* Mobile */}
          <div>
            <label className="label">Mobile Number *</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              maxLength={10}
              value={form.mobile}
              onChange={e => handleFormChange('mobile', e.target.value.replace(/\D/g, ''))}
              className="input-field"
            />
            <FieldError msg={formErrors.mobile} />
          </div>

          {/* Department */}
          <div>
            <label className="label">Branch / Department *</label>
            <select value={form.department} onChange={e => handleFormChange('department', e.target.value)} className="input-field">
              <option value="">Select your department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <FieldError msg={formErrors.department} />
          </div>

          {/* Academic year */}
          <div>
            <label className="label">Academic Year *</label>
            <select value={form.academic_year} onChange={e => handleFormChange('academic_year', e.target.value)} className="input-field">
              <option value="">Select your year</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <FieldError msg={formErrors.academic_year} />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
            <button onClick={goToReview}       className="btn-primary flex-1">Review Details →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Review ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="text-xl font-bold text-white mb-5">Review Your Reservation</h2>

            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Room Details</h3>
              {[
                ['Room ID',  room.room_id],
                ['Block',    room.block === 'AC' ? 'AC Block' : 'Non-AC Block'],
                ['Floor',    `Floor ${room.floor}`],
                ['Type',     room.room_type],
                ['Capacity', `${room.capacity} people`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-slate-700/30">
                  <span className="text-slate-400 text-sm">{k}</span>
                  <span className="text-white text-sm font-medium">{v}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Student Details</h3>
              {[
                ['Name',          form.full_name],
                ['Roll Number',   form.roll_number.toUpperCase()],
                ['Email',         form.email],
                ['Mobile',        form.mobile],
                ['Department',    form.department],
                ['Academic Year', form.academic_year],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-slate-700/30">
                  <span className="text-slate-400 text-sm">{k}</span>
                  <span className="text-white text-sm font-medium text-right max-w-xs">{v}</span>
                </div>
              ))}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-5 text-sm text-amber-300">
              ⚠️ Once confirmed, this room will be immediately reserved in your name.
              No payment is required.
            </div>

            {submitError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                <div className="flex gap-2">
                  <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{submitError}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} disabled={submitting} className="btn-secondary flex-1">
                ← Edit Details
              </button>
              <button onClick={handleConfirm} disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {submitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <><CheckCircle size={16} /> Confirm Reservation</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
