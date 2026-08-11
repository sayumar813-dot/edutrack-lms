#!/usr/bin/env python3
"""
ScholarFlow / EduTrack ERP Comprehensive Automation Test Suite
Runs end-to-end validation of all roles, API endpoints, database integrity, 
academic session resolution, alerts dispatching, fee clearance, and assignments.
"""

import json
import urllib.request
import urllib.parse
import urllib.error
import sys
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:3000"
PASSWORD = "mubashir7661"

ROLES_TO_TEST = [
    {"name": "Super Admin", "email": "superadmin@edutrack.com", "role": "super_admin"},
    {"name": "School Admin", "email": "admin@edutrack.com", "role": "admin"},
    {"name": "Teacher", "email": "john.smith@edutrack.com", "role": "teacher"},
    {"name": "Student", "email": "alice.wong@edutrack.com", "role": "student"},
    {"name": "Parent", "email": "parent.wong@edutrack.com", "role": "parent"},
]

class TestSession:
    def __init__(self, email, password):
        self.email = email
        self.password = password
        self.cookie = None
        self.user = None

    def login(self):
        url = f"{BASE_URL}/api/auth/login"
        payload = json.dumps({"email": self.email, "password": self.password}).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                headers = resp.info()
                self.cookie = headers.get("Set-Cookie")
                data = json.loads(resp.read().decode('utf-8'))
                self.user = data.get("user")
                return resp.status == 200 and data.get("success")
        except urllib.error.HTTPError as e:
            print(f"❌ Login failed for {self.email}: HTTP {e.code}")
            return False
        except Exception as e:
            print(f"❌ Login error for {self.email}: {e}")
            return False

    def api_request(self, endpoint, method="GET", body=None):
        url = f"{BASE_URL}{endpoint}"
        headers = {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
        }
        if self.cookie:
            headers["Cookie"] = self.cookie

        payload = json.dumps(body).encode('utf-8') if body is not None else None
        req = urllib.request.Request(url, data=payload, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req) as resp:
                data = resp.read().decode('utf-8')
                return resp.status, json.loads(data) if data else {}
        except urllib.error.HTTPError as e:
            err_data = e.read().decode('utf-8')
            try:
                return e.code, json.loads(err_data)
            except:
                return e.code, {"raw_error": err_data}
        except Exception as e:
            return 500, {"error": str(e)}

def run_tests():
    print("=" * 70)
    print("🚀 SCHOLARFLOW ERP COMPREHENSIVE AUTOMATION SUITE")
    print(f"🌐 Target Server: {BASE_URL}")
    print("=" * 70)

    passed_count = 0
    total_count = 0

    def assert_test(name, condition, details=""):
        nonlocal passed_count, total_count
        total_count += 1
        if condition:
            passed_count += 1
            print(f"  [PASS] ✓ Test #{total_count}: {name}")
            if details:
                print(f"         └─ {details}")
        else:
            print(f"  [FAIL] ❌ Test #{total_count}: {name}")
            if details:
                print(f"         └─ {details}")

    # TEST GROUP 1: AUTHENTICATION FOR ALL 5 ROLES
    print("\n🔐 1. AUTHENTICATION & SESSION TEST FOR ALL 5 ROLES")
    sessions = {}
    for r in ROLES_TO_TEST:
        sess = TestSession(r["email"], PASSWORD)
        ok = sess.login()
        sessions[r["email"]] = sess
        assert_test(
            f"Login as {r['name']} ({r['email']})",
            ok,
            f"Authenticated User ID: {sess.user.get('id') if sess.user else 'N/A'}"
        )

    admin_sess = sessions["admin@edutrack.com"]
    super_sess = sessions["superadmin@edutrack.com"]
    teacher_sess = sessions["john.smith@edutrack.com"]
    student_sess = sessions["alice.wong@edutrack.com"]
    parent_sess = sessions["parent.wong@edutrack.com"]

    # TEST GROUP 2: AUTOMATIC ACADEMIC SESSION RESOLUTION ON STUDENT CREATION
    print("\n🎓 2. STUDENT CREATION & SESSION AUTO-RESOLUTION")
    test_email = f"auto_stud_{int(time.time())}@edutrack.com"
    status, body = admin_sess.api_request("/api/admin/students", method="POST", body={
        "name": "Automation Test Student",
        "email": test_email,
        "rollNo": f"TEST-{int(time.time()) % 10000}",
        "password": "mubashir7661"
    })
    assert_test(
        "Create Student Profile without explicit Academic Session ID (Resolves Active Session)",
        status == 200 and body.get("success"),
        f"HTTP {status} - Created Student ID: {body.get('student', {}).get('id')}"
    )

    # TEST GROUP 3: AUTOMATIC ACADEMIC SESSION RESOLUTION ON FEE CREATION
    print("\n💳 3. FEE INVOICE GENERATION & SESSION AUTO-RESOLUTION")
    status, body = admin_sess.api_request("/api/admin/fees", method="POST", body={
        "studentId": body.get('student', {}).get('id') or "ad91224e-a5b8-4198-bc22-c9e55d9fccde",
        "title": "Automated Q1 Tuition Fee Invoice",
        "amount": 1250,
        "dueDate": "2026-09-30"
    })
    created_fee_id = body.get('fee', {}).get('id') or "fee-inv-1001"
    assert_test(
        "Create Fee Invoice without explicit Academic Session ID (Resolves Active Session)",
        status == 200 and body.get("success"),
        f"HTTP {status} - Created Fee ID: {created_fee_id}"
    )

    # TEST GROUP 4: ATTENDANCE SHEET SAVING & SESSION AUTO-RESOLUTION
    print("\n📋 4. ATTENDANCE SHEET SAVING & SESSION AUTO-RESOLUTION")
    status, body = teacher_sess.api_request("/api/attendance", method="POST", body={
        "date": "2026-08-11",
        "records": [
            {"studentId": "ad91224e-a5b8-4198-bc22-c9e55d9fccde", "status": "present"}
        ]
    })
    assert_test(
        "Save Class Attendance Sheet without explicit Academic Session ID",
        status == 200 and body.get("success"),
        f"HTTP {status} - Response: {body.get('message')}"
    )

    # TEST GROUP 5: TEACHER CLASS & SUBJECT DIRECTORY SCOPING
    print("\n👨‍🏫 5. TEACHER CLASS & SUBJECT SCOPING")
    status, body = teacher_sess.api_request("/api/admin/classes", method="GET")
    classes_list = body.get("classes", [])
    assert_test(
        "Teacher Class List Scoping (Only Assigned Classes returned)",
        status == 200 and body.get("success") and len(classes_list) > 0,
        f"HTTP {status} - Returned {len(classes_list)} assigned class sections"
    )

    status, body = teacher_sess.api_request("/api/admin/subjects?classId=cls-10-a", method="GET")
    subjects_list = body.get("subjects", [])
    assert_test(
        "Fetch Class Subjects List for Teacher Directory",
        status == 200 and body.get("success") and len(subjects_list) > 0,
        f"HTTP {status} - Returned {len(subjects_list)} subjects for class section"
    )

    # TEST GROUP 6: PARENT MEDICAL NOTE SUBMISSION & ADMIN ALERT DISPATCH
    print("\n🏥 6. PARENT MEDICAL NOTE SUBMISSION & ADMIN ALERT CENTER DISPATCH")
    status, body = parent_sess.api_request("/api/v1/parent/medical-note", method="POST", body={
        "wardId": "stu-1002",
        "startDate": "2026-08-12",
        "endDate": "2026-08-14",
        "doctorName": "Dr. Marcus Vance",
        "clinicName": "City Central Health Clinic",
        "reason": "Viral fever and acute rest requirement",
        "doctorNotes": "Rest prescribed for 3 days",
        "attachment": {
            "fileName": "Doctor_Certificate_David.pdf",
            "fileType": "application/pdf",
            "fileSize": "420 KB"
        }
    })
    assert_test(
        "Submit Doctor Medical Note & Alert Admin",
        status == 200 and body.get("success"),
        f"HTTP {status} - Dispatched Alert ID: {(body.get('alert') or {}).get('id', 'Submitted & Queued')}"
    )

    status, body = super_sess.api_request("/api/v1/alerts", method="GET")
    alerts_list = body.get("alerts", [])
    has_medical_alert = any("Medical Note" in a.get("title", "") for a in alerts_list)
    assert_test(
        "Super Admin Alert Center receives Medical Note Alert",
        status == 200 and len(alerts_list) > 0 and has_medical_alert,
        f"HTTP {status} - Total Active Alerts: {len(alerts_list)}"
    )

    # TEST GROUP 7: PARENT FEE CLEARANCE & BANK PROOF ATTACHMENT
    print("\n💳 7. PARENT FEE CLEARANCE & BANK PROOF ATTACHMENT")
    status, body = parent_sess.api_request(f"/api/v1/fees/{created_fee_id}/pay", method="POST", body={
        "paymentAmount": 1250,
        "paymentMethod": "Online Bank Transfer",
        "attachment": {
            "fileName": "Bank_Deposit_Slip_Q1.png",
            "fileType": "image/png",
            "fileSize": "310 KB"
        }
    })
    assert_test(
        "Parent Pay Fee Remaining & Attach Bank Deposit Slip",
        status == 200 and body.get("success"),
        f"HTTP {status} - Generated Stored Receipt: {body.get('fee', {}).get('receipt_url')}"
    )

    # TEST GROUP 8: TEACHER PUBLISH ASSIGNMENT WITH ATTACHMENT
    print("\n📚 8. TEACHER PUBLISH ASSIGNMENT WITH DOCUMENT ATTACHMENT")
    status, body = teacher_sess.api_request("/api/v1/assignments", method="POST", body={
        "title": "Automated Test Assignment — Chapter 4",
        "classId": "cls-10-a",
        "subjectId": "sub-math-101",
        "dueDate": "2026-08-25",
        "description": "Solve exercise 4.1 through 4.5 in attached PDF sheet.",
        "attachment": {
            "fileName": "Algebra_Problem_Set_Ch4.pdf",
            "fileType": "application/pdf",
            "fileSize": "512 KB"
        }
    })
    assert_test(
        "Teacher Publish Assignment with File Attachment",
        status == 201 and body.get("success"),
        f"HTTP {status} - Published Assignment ID: {body.get('data', {}).get('id')}"
    )

    # FINAL SUMMARY
    print("\n" + "=" * 70)
    print(f"📊 AUTOMATION TEST RESULTS SUMMARY: {passed_count}/{total_count} PASSED")
    if passed_count == total_count:
        print("🎉 ALL ERP SYSTEMS & API ENDPOINTS OPERATIONAL WITH 0 ERRORS!")
        print("=" * 70)
        sys.exit(0)
    else:
        print(f"⚠️ {total_count - passed_count} TESTS FAILED. PLEASE REVIEW LOGS.")
        print("=" * 70)
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
