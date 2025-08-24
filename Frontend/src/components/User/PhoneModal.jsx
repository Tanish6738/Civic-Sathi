import React, { useState } from 'react';
import { updateUserPhone } from '../../services/user.services';

const PhoneModal = ({ userId, onSaved }) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const valid = /^[0-9]{10}$/.test(phone);

  async function onSubmit(e){
    e.preventDefault();
    if(!valid){ setError('Enter 10 digit phone'); return; }
    setError(''); setSubmitting(true);
    try { await updateUserPhone(userId, phone); onSaved(phone); }
    catch(e){ setError(e?.response?.data?.message || 'Failed to save'); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm mx-auto bg-white rounded-xl border border-gray-200 shadow-lg p-6 space-y-5">
        <h2 className="text-lg font-semibold tracking-tight text-gray-800">Add Your Phone Number</h2>
        <p className="text-xs text-gray-600 leading-relaxed">For verification and updates, we need a valid 10-digit mobile number. This is required to continue.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Phone Number*</label>
            <input
              autoFocus
              value={phone}
              onChange={e=>setPhone(e.target.value.replace(/[^0-9]/g,''))}
              maxLength={10}
              className="mt-1 w-full h-11 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              placeholder="e.g. 9876543210"
            />
            <div className="mt-1 text-[11px] h-4 text-gray-500">{phone.length>0 && !valid && 'Enter exactly 10 digits'}</div>
          </div>
          {error && <div className="text-xs text-rose-600 font-medium">{error}</div>}
          <button disabled={!valid || submitting} className="w-full h-11 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {submitting && <span className="inline-block h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
            <span>Save & Continue</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default PhoneModal;
