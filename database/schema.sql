-- ============================================================
-- IT HELP DESK TICKET MANAGEMENT SYSTEM - MYSQL SCHEMA
-- ============================================================
CREATE DATABASE IF NOT EXISTS helpdesk_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE helpdesk_db;

-- ---------------- ROLES ----------------
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE   -- Employee, Technician, Admin
);

INSERT INTO roles (name) VALUES ('Employee'), ('Technician'), ('Admin');

-- ---------------- DEPARTMENTS ----------------
CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------- USERS ----------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(50) UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  department_id INT,
  is_active TINYINT(1) DEFAULT 1,
  reset_token VARCHAR(255),
  reset_token_expires DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- ---------------- CATEGORIES ----------------
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active TINYINT(1) DEFAULT 1
);

-- ---------------- SLA SETTINGS ----------------
CREATE TABLE sla_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  priority ENUM('Low','Medium','High','Critical') NOT NULL UNIQUE,
  resolution_minutes INT NOT NULL   -- Critical=30, High=120, Medium=480, Low=1440
);

INSERT INTO sla_settings (priority, resolution_minutes) VALUES
 ('Critical', 30), ('High', 120), ('Medium', 480), ('Low', 1440);

-- ---------------- ASSETS (bonus: link tickets to assets) ----------------
CREATE TABLE assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_number VARCHAR(100) UNIQUE,
  asset_name VARCHAR(150),
  location VARCHAR(150),
  assigned_to INT,
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- ---------------- TICKETS ----------------
CREATE TABLE tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_number VARCHAR(30) NOT NULL UNIQUE,   -- IT-2026-000001
  requester_id INT NOT NULL,
  department_id INT,
  category_id INT,
  priority ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
  status ENUM('New','Open','Assigned','In Progress','Waiting for User',
              'Pending Vendor','Resolved','Closed','Cancelled') NOT NULL DEFAULT 'New',
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  asset_number VARCHAR(100),
  location VARCHAR(150),
  phone VARCHAR(30),
  email VARCHAR(150),
  assigned_technician_id INT,
  due_at DATETIME,              -- computed from SLA
  resolved_at DATETIME,
  closed_at DATETIME,
  satisfaction_rating TINYINT,  -- 1-5, bonus feature
  satisfaction_comment VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (assigned_technician_id) REFERENCES users(id),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_requester (requester_id),
  INDEX idx_technician (assigned_technician_id)
);

-- ---------------- TICKET COMMENTS ----------------
CREATE TABLE ticket_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  is_internal TINYINT(1) DEFAULT 0,  -- internal notes visible only to IT
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ---------------- TICKET ATTACHMENTS ----------------
CREATE TABLE ticket_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  comment_id INT,
  uploaded_by INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES ticket_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- ---------------- TICKET ASSIGNMENT HISTORY ----------------
CREATE TABLE ticket_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  technician_id INT NOT NULL,
  assigned_by INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (technician_id) REFERENCES users(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- ---------------- STATUS HISTORY ----------------
CREATE TABLE ticket_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by INT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- ---------------- NOTIFICATIONS (in-app) ----------------
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ticket_id INT,
  title VARCHAR(255) NOT NULL,
  message VARCHAR(500),
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

-- ---------------- EMAIL LOGS ----------------
CREATE TABLE email_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT,
  recipient VARCHAR(150) NOT NULL,
  subject VARCHAR(255),
  body TEXT,
  status ENUM('Sent','Failed') DEFAULT 'Sent',
  error_message VARCHAR(500),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL
);

-- ---------------- EMAIL SETTINGS (admin configurable) ----------------
CREATE TABLE email_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  smtp_host VARCHAR(150),
  smtp_port INT,
  smtp_user VARCHAR(150),
  smtp_pass VARCHAR(255),
  from_name VARCHAR(150),
  from_email VARCHAR(150),
  it_department_email VARCHAR(150),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------------- SYSTEM SETTINGS ----------------
CREATE TABLE system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value VARCHAR(500)
);

INSERT INTO system_settings (setting_key, setting_value) VALUES
 ('company_name', 'My Company'),
 ('default_language', 'en'),
 ('ticket_prefix', 'IT');

-- ---------------- FAQ / KNOWLEDGE BASE (bonus) ----------------
CREATE TABLE faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ---------------- ACTIVITY / AUDIT LOG ----------------
CREATE TABLE activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,   -- LOGIN, LOGOUT, TICKET_CREATED, etc.
  details VARCHAR(500),
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- SAMPLE DATA
-- ============================================================
INSERT INTO departments (name) VALUES ('IT'), ('Finance'), ('HR'), ('Sales'), ('Operations');

INSERT INTO categories (name) VALUES
 ('Hardware'),('Software'),('Network'),('Printer'),('Email'),('Internet'),
 ('Server'),('Security'),('CCTV'),('ERP System'),('HR System'),
 ('Microsoft Office'),('VPN'),('Other');

-- Default users (password for ALL sample users is: Password123!)
-- bcrypt hash below corresponds to "Password123!"
INSERT INTO users (employee_id, full_name, email, phone, password_hash, role_id, department_id) VALUES
('EMP001','System Admin','admin@company.com','012345678','$2b$10$8kQqK1E0Zt1sM8t1v8f0GOZbYlR0m1H1qzR9d6Yf8wq8yq0v2N6Xa',3,1),
('EMP002','John Technician','tech1@company.com','012345679','$2b$10$8kQqK1E0Zt1sM8t1v8f0GOZbYlR0m1H1qzR9d6Yf8wq8yq0v2N6Xa',2,1),
('EMP003','Jane Employee','employee1@company.com','012345680','$2b$10$8kQqK1E0Zt1sM8t1v8f0GOZbYlR0m1H1qzR9d6Yf8wq8yq0v2N6Xa',1,4);

-- NOTE: Replace the password hashes above by running:
--   node backend/utils/hashPassword.js "Password123!"
-- and pasting the resulting hash if bcrypt version mismatches occur.
