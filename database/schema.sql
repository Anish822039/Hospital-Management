CREATE DATABASE IF NOT EXISTS hms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hms_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ROLES
CREATE TABLE roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name ENUM('admin','doctor','receptionist','staff') NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name, description) VALUES
('admin','Full system access'),
('doctor','Patient records and medical updates'),
('receptionist','Appointments and patient registration'),
('staff','General hospital staff');

-- USERS
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role_id INT UNSIGNED NOT NULL,
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

INSERT INTO users (employee_id, full_name, email, password_hash, role_id, department)
VALUES (
'EMP001','System Administrator','admin@hospital.com',
'$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2FLuYp4kQq',
1,'Administration'
);

-- DOCTORS
CREATE TABLE doctors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    specialization VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    consultation_fee DECIMAL(10,2) DEFAULT 0.00,
    available_days VARCHAR(100),
    available_from TIME DEFAULT '09:00:00',
    available_to TIME DEFAULT '17:00:00',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- PATIENTS
CREATE TABLE patients (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    patient_id VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('male','female','other'),
    phone VARCHAR(20),
    registered_by INT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL
);

-- APPOINTMENTS
CREATE TABLE appointments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    appointment_no VARCHAR(20) NOT NULL UNIQUE,
    patient_id INT UNSIGNED,
    doctor_id INT UNSIGNED,
    appointment_date DATE,
    appointment_time TIME,
    status ENUM('scheduled','completed','cancelled') DEFAULT 'scheduled',
    booked_by INT UNSIGNED,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (booked_by) REFERENCES users(id) ON DELETE SET NULL
);

-- BILLS
CREATE TABLE bills (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bill_no VARCHAR(20) UNIQUE,
    patient_id INT UNSIGNED,
    total DECIMAL(10,2),
    payment_status ENUM('pending','paid') DEFAULT 'pending',
    generated_by INT UNSIGNED,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- COMPLAINTS
CREATE TABLE complaints (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_no VARCHAR(20) UNIQUE,
    reported_by INT UNSIGNED,
    title VARCHAR(255),
    status ENUM('open','resolved') DEFAULT 'open',
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED,
    action VARCHAR(100),
    module VARCHAR(50),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

SET FOREIGN_KEY_CHECKS = 1;