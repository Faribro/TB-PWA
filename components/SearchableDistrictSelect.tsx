'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchableDistrictSelectProps {
  value: string;
  onChange: (value: string) => void;
  state: string;
  disabled?: boolean;
}

// State-District mapping from database
const STATE_DISTRICTS: Record<string, string[]> = {
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Mehsana'],
  'Maharashtra': ['Mumbai City', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Chhatrapati Sambhajinagar (Aurangabad)', 'Solapur', 'Kolhapur'],
  'Mumbai': ['Mumbai City', 'Mumbai Suburban', 'Thane', 'Palghar'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Dewas', 'Sagar', 'Vidisha', 'Raisen', 'Sehore'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Bareilly'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur'],
  'Ladakh': ['Leh', 'Kargil'],
  'Goa': ['North Goa', 'South Goa'],
  'Chandigarh': ['Chandigarh'],
  'DD & DNH': ['Daman', 'Diu', 'Dadra and Nagar Haveli'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai'],
  'Manipur': ['Imphal East', 'Imphal West', 'Thoubal', 'Bishnupur'],
};

export function SearchableDistrictSelect({ value, onChange, state, disabled }: SearchableDistrictSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get districts for selected state
  const availableDistricts = useMemo(() => {
    if (!state || state === 'Other') return [];
    return STATE_DISTRICTS[state] || [];
  }, [state]);

  // Filter districts based on search query
  const filteredDistricts = useMemo(() => {
    if (!searchQuery) return availableDistricts;
    const query = searchQuery.toLowerCase();
    return availableDistricts.filter(district => 
      district.toLowerCase().includes(query)
    );
  }, [availableDistricts, searchQuery]);

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.searchable-district-select')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (district: string) => {
    onChange(district);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  if (!state || state === 'Other') {
    return (
      <div className="text-[13px] font-semibold text-slate-400 italic bg-slate-50 border border-slate-200 rounded px-2.5 py-2">
        Select a state first
      </div>
    );
  }

  return (
    <div className="searchable-district-select relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full text-[13px] font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2.5 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all shadow-sm flex items-center justify-between gap-2 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-slate-400'
        }`}
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>
          {value || 'Select district...'}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <X 
              className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" 
              onClick={handleClear}
            />
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-2 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search districts..."
                  className="w-full pl-8 pr-2 py-1.5 text-[12px] border border-slate-200 rounded focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                  autoFocus
                />
              </div>
            </div>

            {/* District List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredDistricts.length > 0 ? (
                filteredDistricts.map((district) => (
                  <button
                    key={district}
                    type="button"
                    onClick={() => handleSelect(district)}
                    className={`w-full text-left px-3 py-2 text-[13px] font-medium transition-colors ${
                      value === district
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {district}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-[12px] text-slate-400 italic">
                  No districts found
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-slate-200 bg-slate-50">
              <div className="text-[10px] text-slate-500 text-center">
                {filteredDistricts.length} district{filteredDistricts.length !== 1 ? 's' : ''} in {state}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
