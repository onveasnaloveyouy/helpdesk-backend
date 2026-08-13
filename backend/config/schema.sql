CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  department_id INTEGER,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ticket_statuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  color_code TEXT DEFAULT '#6c757d'
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL,
  department_id INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL UNIQUE,
  requester_id INTEGER NOT NULL,
  assigned_technician_id INTEGER,
  category_id INTEGER,
  department_id INTEGER,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'Normal',
  status TEXT DEFAULT 'New',
  location TEXT,
  satisfaction_rating INTEGER,
  satisfaction_comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  closed_at DATETIME,
  due_at DATETIME,
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (assigned_technician_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  comment_id INTEGER,
  uploaded_by INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ticket_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by INTEGER NOT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ticket_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  technician_id INTEGER NOT NULL,
  assigned_by INTEGER NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (technician_id) REFERENCES users(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  comment TEXT NOT NULL,
  is_internal INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sla_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  priority TEXT NOT NULL UNIQUE,
  resolution_minutes INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS email_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL,
  smtp_user TEXT NOT NULL,
  smtp_pass TEXT NOT NULL,
  from_name TEXT,
  from_email TEXT,
  it_department_email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert Default Roles
INSERT OR IGNORE INTO roles (id, name) VALUES (1, 'User'), (2, 'Technician'), (3, 'Admin');

-- Insert Default Departments
INSERT OR IGNORE INTO departments (id, name) VALUES 
(1, 'IT Support'),
(2, 'Human Resources'),
(3, 'Finance'),
(4, 'Administration'),
(5, 'Operations');

-- Insert Default Categories
INSERT OR IGNORE INTO categories (id, name, department_id) VALUES 
(1, 'Hardware - Computer/Laptop issue', 1),
(2, 'Hardware - Printer/Scanner issue', 1),
(3, 'Software - Cannot access Email', 1),
(4, 'Software - Request new installation', 1),
(5, 'Network - No internet/Wi-Fi issue', 1),
(6, 'General - Equipment request', 1),
(7, 'HR - Payroll/Benefits inquiry', 2),
(8, 'Finance - Expense/Invoice issue', 3),
(9, 'Other', NULL);

-- Insert Default Ticket Statuses
INSERT OR IGNORE INTO ticket_statuses (name, type, color_code) VALUES
('New', 'New', '#0dcaf0'),
('In Progress', 'In Progress', '#fd7e14'),
('Complete by IT', 'Complete', '#20c997'),
('Complete by Vendor', 'Complete', '#6c757d');

-- Insert Default SLA Settings
INSERT OR IGNORE INTO sla_settings (priority, resolution_minutes) VALUES 
('Low', 2880),
('Normal', 1440),
('High', 240),
('Critical', 60);

-- Insert Default Admin User (Password is 'password123')
INSERT OR IGNORE INTO users (id, employee_id, full_name, email, password_hash, role_id) VALUES 
(1, 'EMP001', 'System Administrator', 'admin@helpdesk.local', '$2b$10$tZ/n8N3wI5t.p8001k.kOeUvV9f/tB6i.59G7F7b5z.t2.C/n5kG6', 1);
