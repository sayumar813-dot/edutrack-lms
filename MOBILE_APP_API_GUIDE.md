# 📱 ScholarFlow ERP / EduTrack — Mobile App Backend API Integration Guide

This document is for the **Mobile Application Developer** (React Native, Flutter, Swift/iOS, Kotlin/Android) connecting to the **ScholarFlow ERP / EduTrack** Next.js & Supabase backend.

---

## 🌐 1. Server Base URLs & CORS

- **Local Dev Server**: `http://<your-computer-ip>:3000` (e.g. `http://192.168.1.100:3000`)
- **Production Server**: `https://edutrack-lms.vercel.app` (or your live domain)

> 💡 **Headers**: Set `Content-Type: application/json` on all `POST`/`PUT` requests. For session authentication, include cookies (`credentials: 'include'`) or pass authorization headers.

---

## 🔐 2. Authentication API Endpoints

### `POST /api/auth/login`
Authenticates a user and establishes session.

- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Request Body**:
```json
{
  "email": "parent.wong@edutrack.com",
  "password": "mubashir7661"
}
```
- **Response**:
```json
{
  "success": true,
  "user": {
    "id": "usr-parent-101",
    "email": "parent.wong@edutrack.com",
    "name": "Arthur Wong",
    "role": "PARENT"
  }
}
```

### `GET /api/auth/me`
Gets current authenticated user details.

- **URL**: `/api/auth/me`
- **Method**: `GET`
- **Response**: Returns logged in user profile & role.

### `POST /api/auth/logout`
Destroys session cookies / token.

---

## 👨‍👩‍👧 3. Parent & Wards API Endpoints

### `GET /api/v1/parent/wards`
Returns list of children/wards linked to the logged-in parent.

- **URL**: `/api/v1/parent/wards`
- **Method**: `GET`
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "stu-1001",
      "name": "Alice Wong",
      "rollNumber": "STU-1001",
      "class": "Grade 10 - Section A",
      "attendancePercentage": 92,
      "pendingBalance": 1500,
      "recentGrade": "A",
      "hasAbsenceWarning": false
    }
  ]
}
```

### `POST /api/v1/parent/medical-note`
Allows parents to submit doctor certificates / absence excuses with image/PDF base64 attachment.

- **URL**: `/api/v1/parent/medical-note`
- **Method**: `POST`
- **Request Body**:
```json
{
  "wardName": "Alice Wong",
  "noteTitle": "Severe Fever Rest Certificate",
  "startDate": "2026-08-11",
  "endDate": "2026-08-13",
  "doctorName": "Dr. Marcus Vance",
  "clinicName": "City Central Health Clinic",
  "details": "Prescribed 3 days rest due to viral fever.",
  "attachment": {
    "fileName": "Doctor_Certificate_Alice_Wong.pdf",
    "fileType": "application/pdf",
    "fileData": "data:application/pdf;base64,...",
    "fileSize": "485 KB"
  }
}
```

---

## 📋 4. Attendance API Endpoints

### `GET /api/attendance`
Fetches student roster & current attendance statuses for a class section.

- **Query Params**: `classId` (e.g. `cls-g10a`), `date` (e.g. `2026-08-11`)

### `POST /api/attendance`
Saves or updates daily attendance records for a class section.

- **Request Body**:
```json
{
  "classId": "cls-g10a",
  "date": "2026-08-11",
  "records": [
    { "studentId": "stu-1001", "status": "PRESENT" },
    { "studentId": "stu-1002", "status": "ABSENT", "remarks": "Sick leave" }
  ]
}
```

### `GET /api/attendance/summary`
Returns attendance statistics & percentage summaries.

---

## 💳 5. Tuition & Fee Payment API Endpoints

### `GET /api/v1/fees`
Fetches fee invoices & balances for a student or parent.

### `POST /api/v1/fees/[id]/pay`
Submits fee payment with bank deposit slip attachment.

---

## 📚 6. Assignments & Exam Marks API Endpoints

### `GET /api/v1/assignments`
Returns active homework & assignments for a class section.

### `POST /api/v1/assignments/[id]/submit`
Submits assignment answers & document attachments.

### `GET /api/v1/exams` & `GET /api/v1/exams/[id]/marks`
Returns exam schedules, marks breakdown, and report cards.

---

## 🔑 7. Test Credentials for Mobile Developer

| Role | Email | Password |
|---|---|---|
| **👑 Super Admin** | `superadmin@edutrack.com` | `mubashir7661` |
| **🏫 School Admin** | `admin@edutrack.com` | `mubashir7661` |
| **👨‍🏫 Teacher** | `john.smith@edutrack.com` | `mubashir7661` |
| **🎓 Student** | `alice.wong@edutrack.com` | `mubashir7661` |
| **👨‍👩‍👧 Parent** | `parent.wong@edutrack.com` | `mubashir7661` |
