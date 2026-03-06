-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id BIGSERIAL PRIMARY KEY,
  unique_id TEXT UNIQUE NOT NULL,
  inmate_name TEXT NOT NULL,
  screening_state TEXT,
  screening_district TEXT,
  facility_name TEXT,
  screening_date DATE,
  xray_result TEXT,
  referral_date DATE,
  tb_diagnosed TEXT,
  att_start_date DATE,
  att_completion_date DATE,
  risk_score INTEGER DEFAULT 0,
  age INTEGER,
  sex TEXT,
  symptoms_10s TEXT,
  tb_past_history TEXT,
  follow_up_status TEXT,
  last_contact_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Allow public read access (adjust based on your needs)
CREATE POLICY "Allow public read" ON patients FOR SELECT USING (true);

-- Insert sample data
INSERT INTO patients (unique_id, inmate_name, screening_state, screening_district, facility_name, screening_date, xray_result, age, sex, risk_score, symptoms_10s, tb_past_history) VALUES
('TB001', 'John Doe', 'Madhya Pradesh', 'Gwalior', 'Central Jail Gwalior', '2024-01-15', 'Abnormal - Suspeced_TB_Case', 45, 'M', 75, 'Cough, Fever', 'No'),
('TB002', 'Jane Smith', 'Madhya Pradesh', 'Indore', 'District Jail Indore', '2024-01-16', 'Abnormal - Suspeced_TB_Case', 38, 'F', 65, 'Cough', 'Yes'),
('TB003', 'Robert Johnson', 'Madhya Pradesh', 'Bhopal', 'Central Jail Bhopal', '2024-01-17', 'Abnormal - Suspeced_TB_Case', 52, 'M', 80, 'Cough, Weight Loss', 'No');
