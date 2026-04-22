# 🏥 Hospital Management System (HMS)

A secure, role-based, full-stack web application for internal hospital operations.

---

## Tech Stack
| Layer      | Technology |
|------------|-----------|
| Frontend   | HTML5 · CSS3 · Vanilla JS (SPA) |
| Backend    | Node.js · Express.js |
| Database   | MySQL 8.0+ |
| Auth       | JWT · bcryptjs |
| Security   | Helmet · CORS · Rate Limiting · express-validator |
| Logging    | Winston |

---

## Project Structure
```
hms/
├── backend/
│   ├── config/
│   │   ├── db.js           # MySQL connection pool
│   │   └── logger.js       # Winston logger
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── patientController.js
│   │   ├── appointmentController.js
│   │   ├── billController.js
│   │   ├── complaintController.js
│   │   ├── doctorController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   ├── auth.js          # JWT + RBAC
│   │   ├── validate.js      # Input validation
│   │   ├── auditLog.js      # Action logging
│   │   └── errorHandler.js  # Global error handler
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── patients.js
│   │   ├── appointments.js
│   │   ├── bills.js
│   │   ├── complaints.js
│   │   ├── doctors.js
│   │   └── dashboard.js
│   ├── logs/               # Auto-created
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   └── index.html          # Single-page application
├── database/
│   └── schema.sql          # Full DB schema
└── README.md
```

---

## ⚙️ Setup Instructions

### 1. Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm

### 2. Database Setup
```sql
-- Run as MySQL root:
CREATE USER 'hms_user'@'localhost' IDENTIFIED BY 'YourStrongDBPassword123!';
GRANT ALL PRIVILEGES ON hms_db.* TO 'hms_user'@'localhost';
FLUSH PRIVILEGES;
```
```bash
mysql -u root -p < database/schema.sql
```

### 3. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your values:
#   DB_PASSWORD, JWT_SECRET (run: openssl rand -base64 48)
npm install
npm start
# Dev mode (auto-reload):
npm run dev
```

### 4. Access the Application
Open your browser at: **http://localhost:5000**

### 5. Default Login
| Email               | Password  | Role  |
|---------------------|-----------|-------|
| admin@hospital.com  | Admin@123 | Admin |

> ⚠️ **Change the default password immediately after first login!**

---

## 🔐 Security Features
- JWT authentication (8h expiry)
- bcrypt password hashing (cost factor 12)
- Role-based access control (Admin · Doctor · Receptionist · Staff)
- Rate limiting (100 req/15min global; 5 login attempts/15min)
- Helmet.js HTTP security headers
- CORS restricted to configured origin
- SQL injection prevention via parameterised queries
- Input validation and sanitisation (express-validator)
- Audit logging for all write operations
- Passwords never returned in API responses

---

## 📡 API Reference

### Authentication
| Method | Endpoint               | Access |
|--------|------------------------|--------|
| POST   | /api/auth/login        | Public |
| GET    | /api/auth/me           | All    |
| POST   | /api/auth/change-password | All |

### Patients
| Method | Endpoint                    | Access           |
|--------|-----------------------------|------------------|
| GET    | /api/patients               | All staff        |
| GET    | /api/patients/:id           | All staff        |
| POST   | /api/patients               | All staff        |
| PUT    | /api/patients/:id           | All staff        |
| POST   | /api/patients/:id/records   | Admin, Doctor    |

### Appointments
| Method | Endpoint                        | Access    |
|--------|---------------------------------|-----------|
| GET    | /api/appointments               | All staff |
| POST   | /api/appointments               | All staff |
| PUT    | /api/appointments/:id           | All staff |
| PATCH  | /api/appointments/:id/status    | All staff |
| DELETE | /api/appointments/:id           | All staff |

### Bills
| Method | Endpoint            | Access                  |
|--------|---------------------|-------------------------|
| GET    | /api/bills          | Admin, Receptionist, Staff |
| GET    | /api/bills/:id      | Admin, Receptionist, Staff |
| POST   | /api/bills          | Admin, Receptionist, Staff |
| PATCH  | /api/bills/:id/pay  | Admin, Receptionist, Staff |

### Employees (Admin only)
| Method | Endpoint                      |
|--------|-------------------------------|
| GET    | /api/users                    |
| POST   | /api/users                    |
| PUT    | /api/users/:id                |
| DELETE | /api/users/:id (deactivates)  |
| PUT    | /api/users/:id/reset-password |

### Complaints
| Method | Endpoint            | Access      |
|--------|---------------------|-------------|
| GET    | /api/complaints     | All staff   |
| POST   | /api/complaints     | All staff   |
| PUT    | /api/complaints/:id | Admin only  |

### Dashboard & Doctors
| Method | Endpoint            | Access    |
|--------|---------------------|-----------|
| GET    | /api/dashboard/stats | All staff |
| GET    | /api/doctors         | All staff |
| POST   | /api/doctors         | Admin     |
| PUT    | /api/doctors/:id     | Admin     |

---

## 🚀 Production Deployment

### Environment Variables (.env)
```env
NODE_ENV=production
PORT=5000
DB_HOST=your-db-host
DB_USER=hms_user
DB_PASSWORD=your-strong-password
DB_NAME=hms_db
JWT_SECRET=your-64-char-random-secret
ALLOWED_ORIGIN=https://your-hospital-domain.com
```

### PM2 (Process Manager)
```bash
npm install -g pm2
pm2 start server.js --name "hms-api"
pm2 save
pm2 startup
```

### Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name hms.yourhospital.com;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name hms.yourhospital.com;
    ssl_certificate /etc/ssl/your-cert.pem;
    ssl_certificate_key /etc/ssl/your-key.pem;
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL/TLS
Use **Let's Encrypt** (certbot) or your hospital's SSL certificate.

---

## Role Permissions Matrix

| Feature              | Admin | Doctor | Receptionist | Staff |
|----------------------|:-----:|:------:|:------------:|:-----:|
| View Dashboard       | ✅    | ✅     | ✅           | ✅    |
| Manage Employees     | ✅    | ❌     | ❌           | ❌    |
| View Patients        | ✅    | ✅     | ✅           | ✅    |
| Add/Edit Patients    | ✅    | ✅     | ✅           | ✅    |
| Add Medical Records  | ✅    | ✅     | ❌           | ❌    |
| Manage Appointments  | ✅    | ✅     | ✅           | ✅    |
| Generate Bills       | ✅    | ❌     | ✅           | ✅    |
| View Billing         | ✅    | ❌     | ✅           | ✅    |
| Report Complaints    | ✅    | ✅     | ✅           | ✅    |
| Resolve Complaints   | ✅    | ❌     | ❌           | ❌    |
| Doctor Profiles      | ✅    | ❌     | ❌           | ❌    |
| System Settings      | ✅    | ❌     | ❌           | ❌    |
