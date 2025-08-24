import React, { useState } from 'react';
import { updateUserPhone } from '../../services/user.services';

// Modal uses theme tokens (see theme.css) to stay consistent with purple + white palette.
const PhoneModal = ({ userId, onSaved }) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const valid = /^[0-9]{10}$/.test(phone);

  async function onSubmit(e) {
    e.preventDefault();
    if (!valid) { setError('Enter a 10‑digit number'); return; }
    setError('');
    setSubmitting(true);
    try {
      await updateUserPhone(userId, phone);
      onSaved(phone);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  const helperId = 'phone-helper';
  const errorId = 'phone-error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Themed overlay with subtle purple tint */}
      <div className="absolute inset-0 bg-[rgba(var(--ds-primary),0.35)] backdrop-blur-md" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-modal-title"
        aria-describedby={error ? errorId : helperId}
        className="relative w-full max-w-sm mx-auto overflow-hidden rounded-2xl shadow-elevate border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))]"
      >
        {/* Header gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[rgb(var(--ds-primary))] via-[rgb(var(--ds-secondary))] to-[rgb(var(--ds-primary))]" />

        <div className="p-6 pt-5 space-y-5">
          <header className="space-y-1">
            <h2 id="phone-modal-title" className="text-lg font-semibold tracking-tight text-gradient-primary">Add Your Phone Number</h2>
            <p id={helperId} className="text-[11px] leading-relaxed text-soft">
              We use this only for secure verification & important updates. Enter your active 10‑digit mobile number.
            </p>
          </header>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-xs font-medium uppercase tracking-wide text-soft">Phone Number<span className="text-[rgb(var(--ds-error))]">*</span></label>
                <div className="relative group">
                  <input
                    id="phone"
                    autoFocus
                    inputMode="numeric"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={10}
                    aria-invalid={!!error || (phone.length > 0 && !valid)}
                    aria-describedby={(error ? errorId + ' ' : '') + helperId}
                    className={`peer w-full h-12 px-3 pr-11 rounded-xl text-sm font-medium bg-[rgb(var(--ds-surface))] border transition shadow-sm focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.35)]
                      ${phone.length > 0 && !valid ? 'border-[rgb(var(--ds-error))]' : 'border-[rgb(var(--ds-border))] focus:border-[rgb(var(--ds-primary))]'}
                    `}
                    placeholder="9876543210"
                  />
                  {/* Animated ring accent */}
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] font-semibold tracking-wider text-soft peer-focus:text-[rgb(var(--ds-primary))]">
                    {phone.length}/10
                  </span>
                </div>
                <div className="min-h-4 text-[11px] font-medium">
                  {phone.length > 0 && !valid && (
                    <span className="text-[rgb(var(--ds-warning))]">Enter exactly 10 digits</span>
                  )}
                </div>
              </div>

              {error && (
                <div id={errorId} className="flex items-center gap-2 rounded-md border border-[rgb(var(--ds-error))] bg-[rgba(var(--ds-error),0.08)] px-3 py-2 text-[11px] font-medium text-[rgb(var(--ds-error))]">
                  <span className="h-2 w-2 rounded-full bg-[rgb(var(--ds-error))] animate-pulse" />
                  {error}
                </div>
              )}

              <button
                disabled={!valid || submitting}
                className="relative w-full h-12 rounded-xl text-sm font-semibold tracking-wide text-white shadow transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.35)] bg-gradient-to-r from-[rgb(var(--ds-primary))] via-[rgb(var(--ds-secondary))] to-[rgb(var(--ds-primary))] hover:brightness-105 active:scale-[.985]"
              >
                {submitting && (
                  <span className="absolute left-4 inline-block h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                <span className="drop-shadow-sm">{submitting ? 'Saving…' : 'Save & Continue'}</span>
              </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default PhoneModal;
