'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  MapPin, 
  Building2, 
  Activity, 
  Calendar,
  TriangleAlert,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export interface FilterState {
  facilityType: string;
  state: string;
  district: string;
  phase: string;
  overdueOnly: boolean;
  tbDiagnosed: string;
  hivStatus: string;
  dateFrom: string;
  dateTo: string;
}

interface AdvancedFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  states: string[];
  districts: string[];
  facilityTypes: string[];
  isOpen: boolean;
  searchTerm: string;
}

export function AdvancedFilterBar({
  filters,
  onFilterChange,
  states,
  districts,
  facilityTypes,
  isOpen,
  searchTerm
}: AdvancedFilterBarProps) {
  const [isExporting, setIsExporting] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    const filterValue = value?.startsWith?.('all-') ? '' : value;
    const newFilters = { ...filters, [key]: filterValue };
    
    if (key === 'state') {
      newFilters.district = '';
    }
    
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange({
      facilityType: '',
      state: '',
      district: '',
      phase: '',
      overdueOnly: false,
      tbDiagnosed: '',
      hivStatus: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const handleExportXLSX = async () => {
    setIsExporting(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      
      let query = supabase.from('patients').select('*');
      
      if (searchTerm) {
        query = query.or(`inmate_name.ilike.%${searchTerm}%,unique_id.ilike.%${searchTerm}%`);
      }
      if (filters.state) query = query.eq('screening_state', filters.state);
      if (filters.district) query = query.eq('screening_district', filters.district);
      if (filters.facilityType) query = query.eq('facility_type', filters.facilityType);
      if (filters.tbDiagnosed) query = query.eq('tb_diagnosed', filters.tbDiagnosed);
      if (filters.hivStatus) query = query.eq('hiv_status', filters.hivStatus);
      if (filters.dateFrom) query = query.gte('screening_date', filters.dateFrom);
      if (filters.dateTo) query = query.lte('screening_date', filters.dateTo);
      
      const { data } = await query.order('created_at', { ascending: false });
      
      if (data) {
        const XLSX = await import('xlsx');
        const worksheetData = data.map(p => ({
          'Patient Name': p.inmate_name,
          'Unique ID': p.unique_id,
          'State': p.screening_state,
          'District': p.screening_district,
          'Facility': p.facility_name,
          'Facility Type': p.facility_type,
          'Screening Date': p.screening_date?.split('T')[0] || '',
          'X-Ray Result': p.xray_result || '',
          'Referral Date': p.referral_date?.split('T')[0] || '',
          'TB Diagnosed': p.tb_diagnosed === 'Y' ? 'Yes' : p.tb_diagnosed === 'N' ? 'No' : 'Pending',
          'HIV Status': p.hiv_status || 'Unknown',
          'ATT Start Date': p.att_start_date?.split('T')[0] || '',
          'Age': p.age,
          'Sex': p.sex
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Patients');
        XLSX.writeFile(workbook, `TB_Patient_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return isOpen ? (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -10 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="mt-4"
    >
      <Card className="bg-gradient-to-br from-slate-50/80 to-white border-slate-200/60 shadow-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Advanced Filters</h3>
              <p className="text-sm text-slate-500 mt-1">Refine your patient data view</p>
            </div>
            <Button
              onClick={clearAllFilters}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-5 w-5 mr-1" />
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-slate-500" />
                <h4 className="text-xs font-bold tracking-widest text-slate-500 uppercase">Location</h4>
              </div>
              
              <Select value={filters.state || 'all-states'} onValueChange={(value) => updateFilter('state', value)}>
                <SelectTrigger className="bg-white border-slate-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all">
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-states">All States</SelectItem>
                  {states.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filters.district || 'all-districts'} 
                onValueChange={(value) => updateFilter('district', value)}
                disabled={!filters.state}
              >
                <SelectTrigger className="bg-white border-slate-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all">
                  <SelectValue placeholder="Select District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-districts">All Districts</SelectItem>
                  {districts.map(district => (
                    <SelectItem key={district} value={district}>{district}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-slate-500" />
                <h4 className="text-xs font-bold tracking-widest text-slate-500 uppercase">Facility & Phase</h4>
              </div>
              
              <Select value={filters.facilityType || 'all-facility-types'} onValueChange={(value) => updateFilter('facilityType', value)}>
                <SelectTrigger className="bg-white border-slate-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all">
                  <SelectValue placeholder="Facility Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-facility-types">All Facility Types</SelectItem>
                  {facilityTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.phase || 'all-phases'} onValueChange={(value) => updateFilter('phase', value)}>
                <SelectTrigger className="bg-white border-slate-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all">
                  <SelectValue placeholder="Current Phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-phases">All Phases</SelectItem>
                  <SelectItem value="Screening">Screening</SelectItem>
                  <SelectItem value="Sputum Test">Sputum Test</SelectItem>
                  <SelectItem value="Diagnosis">Diagnosis</SelectItem>
                  <SelectItem value="ATT Initiation">ATT Initiation</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-slate-500" />
                <h4 className="text-xs font-bold tracking-widest text-slate-500 uppercase">Medical Status</h4>
              </div>
              
              <Select value={filters.tbDiagnosed || 'all-tb-status'} onValueChange={(value) => updateFilter('tbDiagnosed', value)}>
                <SelectTrigger className="bg-white border-slate-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all">
                  <SelectValue placeholder="TB Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-tb-status">TB Status - All</SelectItem>
                  <SelectItem value="Y">TB Positive</SelectItem>
                  <SelectItem value="N">TB Negative</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.hivStatus || 'all-hiv-status'} onValueChange={(value) => updateFilter('hivStatus', value)}>
                <SelectTrigger className="bg-white border-slate-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all">
                  <SelectValue placeholder="HIV Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-hiv-status">HIV Status - All</SelectItem>
                  <SelectItem value="Positive">HIV Positive</SelectItem>
                  <SelectItem value="Negative">HIV Negative</SelectItem>
                  <SelectItem value="Unknown">HIV Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-slate-500" />
                <h4 className="text-xs font-bold tracking-widest text-slate-500 uppercase">Screening Date Range</h4>
              </div>
              
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter('dateFrom', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                  <label className="absolute -top-2 left-3 px-1 bg-white text-xs text-slate-500 font-medium">
                    From Date
                  </label>
                </div>
                
                <div className="relative">
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter('dateTo', e.target.value)}
                    min={filters.dateFrom || undefined}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                  <label className="absolute -top-2 left-3 px-1 bg-white text-xs text-slate-500 font-medium">
                    To Date
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <TriangleAlert className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-900">SLA Breach Alert</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      Show overdue cases only (30+ days without referral)
                    </p>
                  </div>
                  <Switch
                    checked={filters.overdueOnly}
                    onCheckedChange={(checked) => updateFilter('overdueOnly', checked)}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>
                <Button
                  onClick={handleExportXLSX}
                  disabled={isExporting}
                  variant="outline"
                  className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-8 text-xs ml-4"
                >
                  {isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-2" />
                  )}
                  {isExporting ? 'Exporting...' : 'Export to Excel'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  ) : null;
}
