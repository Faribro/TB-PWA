export type ClinicalColumn =
  | 'referral_date'
  | 'referred_facility'
  | 'tb_diagnosed'
  | 'tb_diagnosis_date'
  | 'tb_type'
  | 'att_start_date'
  | 'att_completion_date'
  | 'hiv_status'
  | 'art_status'
  | 'art_number'
  | 'nikshay_abha_id'
  | 'registration_date'
  | 'remarks'
  | 'other_facility_name'
  | 'closure_reason';

export interface ClinicalFieldDefinition {
  section: string;
  label: string;
  formKey: string;
  column: ClinicalColumn;
  type: 'date' | 'text' | 'select';
  aliases: string[];
}

export const CLINICAL_FIELD_DEFINITIONS: readonly ClinicalFieldDefinition[] = [
  {
    section: 'Sputum & Referral',
    label: 'Referral Date',
    formKey: 'Date of referral for TB Examination (sputum) (dd/mm/yy)',
    column: 'referral_date',
    type: 'date',
    aliases: [
      'referral_date',
      'referraldate',
      'grp_referral/referral_date',
      'grp_referral/Date_of_referral_for_ion_sputum_dd_mm_yy',
      'Date_of_referral_for_ion_sputum_dd_mm_yy',
    ],
  },
  {
    section: 'Sputum & Referral',
    label: 'Referred Facility',
    formKey: 'Name of facility where referred to (Give code/name of all facilities)',
    column: 'referred_facility',
    type: 'select',
    aliases: [
      'referred_facility',
      'referredfacility',
      'referred_to_facility',
      'grp_referral/referred_facility',
      'grp_referral/Name_of_facility_whe_me_of_all_facilities',
      'Name_of_facility_whe_me_of_all_facilities',
    ],
  },
  {
    section: 'Diagnosis',
    label: 'TB Diagnosed',
    formKey: 'TB diagnosed (Y/N)',
    column: 'tb_diagnosed',
    type: 'select',
    aliases: [
      'tb_diagnosed',
      'tbdiagnosed',
      'tb_diagnosed_select',
      'grp_referral/tb_diagnosed',
      'grp_referral/TB_diagnosed',
      'TB_diagnosed',
    ],
  },
  {
    section: 'Diagnosis',
    label: 'Date of Diagnosis',
    formKey: 'Date of TB Diagnosed (dd/mm/yy)',
    column: 'tb_diagnosis_date',
    type: 'date',
    aliases: [
      'tb_diagnosis_date',
      'tbdiagnosisdate',
      'diagnosis_date',
      'grp_referral/tb_diagnosis_date',
      'grp_referral/Date_of_TB_Diagnosed_dd_mm_yy',
      'Date_of_TB_Diagnosed_dd_mm_yy',
    ],
  },
  {
    section: 'Diagnosis',
    label: 'Type of Diagnosis',
    formKey: 'Type of TB Diagnosed (P/EP)',
    column: 'tb_type',
    type: 'select',
    aliases: [
      'tb_type',
      'tbtype',
      'grp_referral/tb_type',
      'grp_referral/Type_of_TB_Diagnosed_P_EP',
      'Type_of_TB_Diagnosed_P_EP',
    ],
  },
  {
    section: 'Treatment',
    label: 'ATT Start Date',
    formKey: 'Date of starting ATT (dd/mm/yyyy)',
    column: 'att_start_date',
    type: 'date',
    aliases: [
      'att_start_date',
      'attstartdate',
      'grp_referral/att_start_date',
      'grp_referral/Date_of_starting_ATT_dd_mm_yyyy',
      'Date_of_starting_ATT_dd_mm_yyyy',
    ],
  },
  {
    section: 'Treatment',
    label: 'ATT Completion Date',
    formKey: 'Date of Treatment Completion (dd/mm/yyyy)',
    column: 'att_completion_date',
    type: 'date',
    aliases: [
      'att_completion_date',
      'attcompletiondate',
      'grp_referral/att_completion_date',
      'grp_referral/Date_of_Treatment_Completion_dd_mm_yyyy',
      'Date_of_Treatment_Completion_dd_mm_yyyy',
    ],
  },
  {
    section: 'HIV & ART Status',
    label: 'HIV Status',
    formKey: 'HIV Status (Positive/Negative/Unknown)',
    column: 'hiv_status',
    type: 'select',
    aliases: [
      'hiv_status',
      'hivstatus',
      'grp_hiv/hiv_status',
      'grp_hiv/HIV_Status_Positive_Negative_',
      'HIV_Status_Positive_Negative_',
    ],
  },
  {
    section: 'HIV & ART Status',
    label: 'ART Status',
    formKey: 'Status at the time of referral (Pre ART/On ART)',
    column: 'art_status',
    type: 'select',
    aliases: [
      'art_status',
      'artstatus',
      'art_status_at_referral',
      'artstatusatreferral',
      'grp_hiv/art_status_at_referral',
      'grp_hiv/Status_at_the_time_o_at_time_of_referral',
      'Status_at_the_time_o_at_time_of_referral',
    ],
  },
  {
    section: 'HIV & ART Status',
    label: 'ART Number',
    formKey: 'ART Number (if on ART at the time of referral)',
    column: 'art_number',
    type: 'text',
    aliases: [
      'art_number',
      'artnumber',
      'grp_hiv/art_number',
      'grp_hiv/ART_Number_if_on_ART_the_time_of_referral',
      'ART_Number_if_on_ART_the_time_of_referral',
    ],
  },
  {
    section: 'Nikshay & Registration',
    label: 'Nikshay/ABHA ID',
    formKey: 'NIKSHAY/ABHA ID',
    column: 'nikshay_abha_id',
    type: 'text',
    aliases: [
      'nikshay_abha_id',
      'nikshayabhaid',
      'nikshay_id',
      'abha_id',
      'grp_reg/nikshay_abha_id',
      'grp_reg/NIKSHAY_ABHA_ID',
      'NIKSHAY_ABHA_ID',
    ],
  },
  {
    section: 'Nikshay & Registration',
    label: 'Registration Date',
    formKey: 'Date of registration (dd/mm/yyyy)',
    column: 'registration_date',
    type: 'date',
    aliases: [
      'registration_date',
      'registrationdate',
      'nikshay_registration_date',
      'nikshayregistrationdate',
      'grp_reg/nikshay_registration_date',
      'grp_reg/Date_of_registration_dd_mm_yyyy',
      'Date_of_registration_dd_mm_yyyy',
    ],
  },
  {
    section: 'Nikshay & Registration',
    label: 'Remarks',
    formKey: 'Remarks',
    column: 'remarks',
    type: 'text',
    aliases: [
      'remarks',
      'grp_reg/remarks',
      'grp_reg/Remarks',
    ],
  },
  {
    section: 'Sputum & Referral',
    label: 'Other Facility Name',
    formKey: 'Other Facility Name',
    column: 'other_facility_name',
    type: 'text',
    aliases: [
      'other_facility_name',
      'otherfacilityname',
      'referred_to_facility_other',
      'referredtofacilityother',
    ],
  },
  {
    section: 'Closure',
    label: 'Closure Reason',
    formKey: 'closure_reason',
    column: 'closure_reason',
    type: 'text',
    aliases: [
      'closure_reason',
      'closurereason',
    ],
  },
];

export const CLINICAL_DB_COLUMNS = CLINICAL_FIELD_DEFINITIONS.map(
  (field) => field.column
);

export const CLINICAL_DATE_COLUMNS = new Set(
  CLINICAL_FIELD_DEFINITIONS
    .filter((field) => field.type === 'date')
    .map((field) => field.column)
);

export const CLINICAL_FORM_FIELD_TO_COLUMN = Object.fromEntries(
  CLINICAL_FIELD_DEFINITIONS.map((field) => [field.formKey, field.column])
) as Record<string, ClinicalColumn>;

export const CLINICAL_ALIAS_TO_COLUMN = Object.fromEntries(
  CLINICAL_FIELD_DEFINITIONS.flatMap((field) => [
    [field.formKey, field.column],
    [field.column, field.column],
    ...field.aliases.map((alias) => [alias, field.column] as const),
  ])
) as Record<string, ClinicalColumn>;

export function getClinicalColumnForInputKey(key: string): ClinicalColumn | undefined {
  return CLINICAL_ALIAS_TO_COLUMN[key];
}

export function isClinicalDbColumn(column: string): column is ClinicalColumn {
  return (CLINICAL_DB_COLUMNS as readonly string[]).includes(column);
}

export function looksLikeClinicalInputKey(key: string): boolean {
  const compact = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return [
    'referral',
    'referred',
    'facility',
    'tbdiagn',
    'tbtype',
    'att',
    'hiv',
    'art',
    'nikshay',
    'abha',
    'registration',
    'remarks',
    'closure',
  ].some((token) => compact.includes(token));
}
