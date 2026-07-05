// TypeScript row shapes that mirror the tables created in
// db/migrations/0001_hrms_core.sql. Kept in sync by hand — update both files
// together when you add/rename a column.

// A department = an organizational unit (e.g. "Engineering", "HR").
export interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
}

// A position = a job title inside a department (e.g. "Senior Developer").
export interface Position {
  id: string;
  department_id: string | null;
  title: string;
  level: string | null;       // Free-form label: Junior / Mid / Senior / Lead.
  salary_grade: number | null; // Optional numeric pay grade.
  created_at: string;
}

// An employee = a person on payroll. `user_id` links back to an auth account
// when the employee has a login; `pos_enabled` flags them for the SariSync POS.
export interface Employee {
  id: string;
  user_id: string | null;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  birth_date: string | null;
  address: string | null;
  department_id: string | null;
  position_id: string | null;
  hire_date: string;
  status: string;
  pos_enabled: boolean;
  created_at: string;
  updated_at: string;
}
