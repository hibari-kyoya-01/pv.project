# 🛠️ Technical Skills & Architecture Mapping
> **Project:** Stock Fundamental Analyzer (Full Stack Web Application)
> เอกสารรวบรวมทักษะความรู้ (Skills), Tech Stack, และขอบเขตความรับผิดชอบ แบ่งตามโครงสร้างโฟลเดอร์ของโปรเจกต์

---

## 🏗️ Overview Skill Matrix
| Layer | Core Technologies | Primary Focus |
|---|---|---|
| **DevOps & CI/CD** | GitHub Actions, YAML, Cloud Deployment | Automation, Testing, Delivery |
| **Database** | SQL (PostgreSQL/MySQL), Migrations | Data Modeling, Schema Versioning |
| **Backend** | Node.js, Express.js, REST API, Firebase Auth | Business Logic, API, Security |
| **Frontend** | HTML5, CSS3, Modern JavaScript/Framework, Axios | UI/UX, Data Visualization |
| **Code Quality** | ESLint, Prettier, Jest/Supertest | Standardizing, Automated Testing |

---

## 📁 Skill Breakdown by Directory Structure
### 1. ⚙️ CI/CD & Automation (`/.github/`)
- **Skills Required:**
  - **CI/CD Pipeline Design:** การเขียน YAML Workflow บน GitHub Actions
  - **Automated Integration:** การตั้งค่าให้รัน Linter, Unit Test และ Integration Test อัตโนมัติทุกครั้งที่มี Pull Request / Push
  - **Deployment Strategy:** การตั้งค่าการ Deploy อัตโนมัติขึ้น Cloud Provider (e.g., Render, Railway, AWS, Vercel)

### 2. 🗄️ Database Management (`/database/`)
- **Skills Required:**
  - **Relational Database Design:** การออกแบบ Relational Schema (Primary Key, Foreign Key, Indexing) สำหรับงบการเงินและรายชื่อหุ้น
  - **Database Migration:** การเขียน SQL Script ควบคุม Version ของ Database Schema ย้อนหลังได้โดยไม่กระทบข้อมูลเดิม
  - **Data Seeding:** การจัดเตรียม Mock Data สำหรับการทดสอบและ Dev Environment

### 3. 🖥️ Backend API & Core Logic (`/server/`)
- **Skills Required:**
  - **Node.js & Express.js:** การสร้าง RESTful API แบบ Modular Structure
  - **Security & Authentication:**
    - การตรวจเช็ก Identity ด้วย **Firebase Auth Token / Admin SDK** (Middleware)
    - การป้องกัน Abuse API ด้วย Rate Limiting และ Security Headers (Helmet/CORS)
  - **Financial Domain & Business Logic (`/services/`):**
    - **Buffett Engine:** คำนวณ Moat, Owner Earnings, Free Cash Flow, Margin of Safety (MOS)
    - **Lynch Engine:** จัดหมวดหมู่ประเภทหุ้น (Fast Growers, Stalwarts, ฯลฯ), คำนวณ PEG Ratio และ Inventory Analysis
  - **Database Access & ORM (`/models/`):** การดึงและ Query ข้อมูล SQL ผ่าน Connection Pool อย่างมีประสิทธิภาพ
  - **Caching Strategy:** การดึงข้อมูลจาก SQL DB ก่อน และสร้าง Fallback ไปดึง External Financial API เมื่อไม่พบข้อมูล
  - **Automated Testing (`/tests/`):**
    - **Unit Testing:** ทดสอบสูตรการคำนวณงบการเงินใน Services ให้ถูกต้อง 100%
    - **Integration Testing:** ทดสอบ Endpoint API ด้วย Supertest

### 4. 🎨 Frontend Application (`/client/`)
- **Skills Required:**
  - **Modern Web Development:** HTML5, Modern CSS (TailwindCSS/CSS Modules), และ JavaScript Core
  - **Component-Based Architecture (`/components/`):**
    - การแยก UI ออกเป็น Reusable Components (Buttons, Loading Skeletons, Modals)
    - **Data Visualization:** การนำข้อมูลการเงินมาแสดงผลด้วย Chart.js / Recharts (Financial Tables, Stock Snapshot)
  - **State & API Integration (`/services/`):**
    - การใช้งาน Axios/Fetch API ร่วมกับ Interceptors เพื่อแนบ Auth Token และจัดการ Error
  - **Data Formatting Utilities (`/utils/`):** การแปลง Raw Data เป็นสัญลักษณ์ทางการเงิน (Currency, Percentage, Compact Number Formats)

### 5. 🛠️ Code Quality & Project Configs (Root Directory)
- **Skills Required:**
  - **Environment Management:** การจัดการตัวแปรสภาพแวดล้อม (`.env`) ป้องกัน Secrets หลุดขึ้น Git
  - **Code Style Enforcement:** การตั้งค่า ESLint และ Prettier เพื่อให้โค้ดมีมาตรฐานเดียวกันทั้งทีม
  - **Dependency Management:** การจัดการ Package Dependencies บน `package.json`

---

## 🎯 Target Domain Knowledge (Financial Analysis)
นอกจากทักษะด้าน Software Development แล้ว โปรเจกต์นี้อาศัยความเข้าใจเชิงธุรกิจและการเงินดังนี้:
1. **Warren Buffett Concept:** Understanding Economic Moat, Owner Earnings Calculation, and Discounted Cash Flow (DCF) / Margin of Safety.
2. **Peter Lynch Concept:** Categorizing Companies (Slow Growers, Stalwarts, Fast Growers, Cyclicals, Turnarounds, Asset Plays) and PEG Ratio Evaluation.
3. **Financial Statements Analysis:** การอ่านและประมวลผล Income Statement, Balance Sheet และ Cash Flow Statement.