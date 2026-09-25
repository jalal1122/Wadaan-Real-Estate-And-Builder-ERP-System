'use client';

import React, { useState, useEffect } from 'react';
import { useCreateContact } from '../hooks/usePersonal';
import { X, UserPlus, AlertCircle } from 'lucide-react';

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateContactModal: React.FC<CreateContactModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createContactMutation = useCreateContact();

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setRelation('Partner');
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Contact name is required.');
      return;
    }

    try {
      await createContactMutation.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || undefined,
        relation: relation.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to create personal contact');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0F172A] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Register Personal Contact</h3>
              <p className="text-xs text-slate-400">Add an individual to your private ledger</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Full Name / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Arshad Sir, Zeeshan Sir, Tariq Bhai"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="0300-1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Relationship</label>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] bg-white"
              >
                <option value="Partner">Partner / Director</option>
                <option value="Friend">Friend</option>
                <option value="Family">Family Member</option>
                <option value="Business Associate">Business Associate</option>
                <option value="Employee / Staff">Employee / Staff</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Private Notes</label>
            <textarea
              rows={2}
              placeholder="Optional remarks regarding this account..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createContactMutation.isPending}
              className="px-5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {createContactMutation.isPending ? 'Registering...' : 'Register Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
