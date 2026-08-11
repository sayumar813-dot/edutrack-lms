const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// 1. Load .env.local variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase URL or Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runSeeder() {
  console.log('🚀 Starting Complete EduTrack Master Dummy Data Seeder...');

  try {
    // ------------------------------------------------------------------------
    // 1. ACADEMIC SESSION
    // ------------------------------------------------------------------------
    let sessionId;
    const { data: existingSess } = await supabase
      .from('academic_sessions')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();

    if (existingSess) {
      sessionId = existingSess.id;
      console.log('✅ Active Academic Session found:', sessionId);
    } else {
      const { data: newSess, error: sessErr } = await supabase
        .from('academic_sessions')
        .insert({
          name: '2025-2026 Academic Term',
          start_date: '2025-09-01',
          end_date: '2026-06-30',
          is_current: true,
        })
        .select()
        .single();
      if (sessErr) throw new Error(`Academic session failed: ${sessErr.message}`);
      sessionId = newSess.id;
      console.log('✅ Created Active Academic Session:', sessionId);
    }

    // Common password hash for test accounts (mubashir7661 & Admin@123)
    const passHash = await bcrypt.hash('mubashir7661', 10);

    // ------------------------------------------------------------------------
    // 2. USER PROFILES (Super Admin, Admin, Teachers, Students, Parents)
    // ------------------------------------------------------------------------
    console.log('👥 Seeding User Profiles...');

    const usersToSeed = [
      { email: 'superadmin@edutrack.com', first_name: 'Super', last_name: 'Administrator', roles: ['SUPER_ADMIN', 'ADMIN'], phone_number: '+1-555-0100' },
      { email: 'admin@edutrack.com', first_name: 'System', last_name: 'Admin', roles: ['ADMIN'], phone_number: '+1-555-0101' },
      { email: 'john.smith@edutrack.com', first_name: 'John', last_name: 'Smith', roles: ['TEACHER'], phone_number: '+1-555-0201' },
      { email: 'sarah.jenkins@edutrack.com', first_name: 'Sarah', last_name: 'Jenkins', roles: ['TEACHER'], phone_number: '+1-555-0202' },
      { email: 'robert.davies@edutrack.com', first_name: 'Robert', last_name: 'Davies', roles: ['TEACHER'], phone_number: '+1-555-0203' },
      { email: 'alice.wong@edutrack.com', first_name: 'Alice', last_name: 'Wong', roles: ['STUDENT'], phone_number: '+1-555-0301' },
      { email: 'david.miller@edutrack.com', first_name: 'David', last_name: 'Miller', roles: ['STUDENT'], phone_number: '+1-555-0302' },
      { email: 'emma.watson@edutrack.com', first_name: 'Emma', last_name: 'Watson', roles: ['STUDENT'], phone_number: '+1-555-0303' },
      { email: 'michael.brown@edutrack.com', first_name: 'Michael', last_name: 'Brown', roles: ['STUDENT'], phone_number: '+1-555-0304' },
      { email: 'sophia.garcia@edutrack.com', first_name: 'Sophia', last_name: 'Garcia', roles: ['STUDENT'], phone_number: '+1-555-0305' },
      { email: 'parent.wong@edutrack.com', first_name: 'Arthur', last_name: 'Wong', roles: ['PARENT'], phone_number: '+1-555-0401' },
      { email: 'parent.miller@edutrack.com', first_name: 'Elena', last_name: 'Miller', roles: ['PARENT'], phone_number: '+1-555-0402' },
    ];

    const userMap = {};

    for (const u of usersToSeed) {
      let authId = null;
      try {
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const existingAuth = (authUsers?.users || []).find(au => au.email === u.email);
        if (existingAuth) {
          authId = existingAuth.id;
          await supabase.auth.admin.updateUserById(authId, { password: 'mubashir7661' });
        } else {
          const { data: createdAuth } = await supabase.auth.admin.createUser({
            email: u.email,
            password: 'mubashir7661',
            email_confirm: true,
            user_metadata: { first_name: u.first_name, last_name: u.last_name, role: u.roles[0]?.toLowerCase() },
          });
          if (createdAuth?.user) authId = createdAuth.user.id;
        }
      } catch (_) {}

      const profilePayload = {
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        roles: u.roles,
        phone_number: u.phone_number,
        password_hash: passHash,
        must_reset_password: false,
      };
      if (authId) profilePayload.id = authId;

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .upsert(profilePayload, { onConflict: 'email' })
        .select()
        .single();

      if (error) {
        console.warn(`User profile upsert note (${u.email}):`, error.message);
      } else {
        userMap[u.email] = profile.id;
      }
    }
    console.log(`✅ Seeded ${Object.keys(userMap).length} user profiles.`);

    // ------------------------------------------------------------------------
    // 3. CLASSES & SECTIONS
    // ------------------------------------------------------------------------
    console.log('🏫 Seeding Classes...');
    const classesToSeed = [
      { name: 'Grade 10 - Section A', section: 'A', room_number: '101', teacher_id: userMap['john.smith@edutrack.com'] },
      { name: 'Grade 10 - Section B', section: 'B', room_number: '102', teacher_id: userMap['sarah.jenkins@edutrack.com'] },
      { name: 'Grade 11 - Science', section: 'Science', room_number: '201', teacher_id: userMap['robert.davies@edutrack.com'] },
    ];

    const classMap = {};
    for (const c of classesToSeed) {
      const { data: cls } = await supabase
        .from('classes')
        .upsert(c, { onConflict: 'name' })
        .select()
        .single();
      if (cls) classMap[c.name] = cls.id;
    }
    console.log(`✅ Seeded ${Object.keys(classMap).length} classes.`);

    // ------------------------------------------------------------------------
    // 4. SUBJECTS
    // ------------------------------------------------------------------------
    console.log('📚 Seeding Subjects...');
    const subjectsToSeed = [
      { name: 'Mathematics 101', code: 'MATH101', class_id: classMap['Grade 10 - Section A'], teacher_id: userMap['john.smith@edutrack.com'] },
      { name: 'Physics 101', code: 'PHY101', class_id: classMap['Grade 10 - Section A'], teacher_id: userMap['sarah.jenkins@edutrack.com'] },
      { name: 'Advanced Chemistry', code: 'CHEM201', class_id: classMap['Grade 11 - Science'], teacher_id: userMap['robert.davies@edutrack.com'] },
      { name: 'English Literature', code: 'ENG101', class_id: classMap['Grade 10 - Section B'], teacher_id: userMap['sarah.jenkins@edutrack.com'] },
    ];

    for (const s of subjectsToSeed) {
      await supabase.from('subjects').upsert(s, { onConflict: 'name' });
    }
    console.log('✅ Seeded subjects.');

    // ------------------------------------------------------------------------
    // 5. STUDENT PROFILES
    // ------------------------------------------------------------------------
    console.log('🎓 Seeding Student Profiles...');
    const studentEmails = [
      { email: 'alice.wong@edutrack.com', roll: 'STU-1001' },
      { email: 'david.miller@edutrack.com', roll: 'STU-1002' },
      { email: 'emma.watson@edutrack.com', roll: 'STU-1003' },
      { email: 'michael.brown@edutrack.com', roll: 'STU-1004' },
      { email: 'sophia.garcia@edutrack.com', roll: 'STU-1005' },
    ];

    const studentProfileMap = {};
    for (const st of studentEmails) {
      const uId = userMap[st.email];
      if (uId) {
        const { data: stProfile } = await supabase
          .from('student_profiles')
          .upsert(
            {
              user_id: uId,
              roll_number: st.roll,
              academic_session_id: sessionId,
            },
            { onConflict: 'roll_number' }
          )
          .select()
          .single();
        if (stProfile) studentProfileMap[st.email] = stProfile.id;
      }
    }
    console.log(`✅ Seeded ${Object.keys(studentProfileMap).length} student profiles.`);

    // ------------------------------------------------------------------------
    // 6. PARENT LINKAGES
    // ------------------------------------------------------------------------
    console.log('👨‍👩‍👧 Seeding Parent Linkages...');
    const parentWongId = userMap['parent.wong@edutrack.com'];
    const parentMillerId = userMap['parent.miller@edutrack.com'];

    if (parentWongId) {
      await supabase.from('parent_profiles').upsert({ id: parentWongId, occupation: 'Software Engineer' }, { onConflict: 'id' });
      if (studentProfileMap['alice.wong@edutrack.com']) {
        await supabase.from('parent_student_links').upsert(
          { parent_id: parentWongId, student_id: studentProfileMap['alice.wong@edutrack.com'], relationship: 'FATHER' },
          { onConflict: 'parent_id, student_id' }
        );
      }
    }
    if (parentMillerId) {
      await supabase.from('parent_profiles').upsert({ id: parentMillerId, occupation: 'Medical Specialist' }, { onConflict: 'id' });
      if (studentProfileMap['david.miller@edutrack.com']) {
        await supabase.from('parent_student_links').upsert(
          { parent_id: parentMillerId, student_id: studentProfileMap['david.miller@edutrack.com'], relationship: 'MOTHER' },
          { onConflict: 'parent_id, student_id' }
        );
      }
    }
    console.log('✅ Seeded parent profiles and ward links.');

    // ------------------------------------------------------------------------
    // 7. ATTENDANCE RECORDS (Past 7 Days)
    // ------------------------------------------------------------------------
    console.log('📅 Seeding 7 Days Attendance Records...');
    const studentProfileIds = Object.values(studentProfileMap);
    const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'LATE'];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const d = new Date();
      d.setDate(d.getDate() - dayOffset);
      const dateStr = d.toISOString().split('T')[0];

      for (let idx = 0; idx < studentProfileIds.length; idx++) {
        const stId = studentProfileIds[idx];
        const status = dayOffset === 0 && idx === 1 ? 'ABSENT' : statuses[(dayOffset + idx) % statuses.length];

        await supabase.from('attendance').upsert(
          {
            student_id: stId,
            academic_session_id: sessionId,
            date: dateStr,
            status,
          },
          { onConflict: 'student_id, date' }
        );
      }
    }
    console.log('✅ Seeded past 7 days attendance history.');

    // ------------------------------------------------------------------------
    // 8. FEE INVOICES
    // ------------------------------------------------------------------------
    console.log('💳 Seeding Fee Invoices...');
    const feesToSeed = [
      { student_id: studentProfileMap['alice.wong@edutrack.com'], title: 'Q1 Tuition & Academic Fee', amount: 1500.0, paid_amount: 1500.0, due_date: '2025-10-15', status: 'PAID' },
      { student_id: studentProfileMap['david.miller@edutrack.com'], title: 'Science Laboratory Equipment Fee', amount: 350.0, paid_amount: 150.0, due_date: '2025-11-30', status: 'PARTIAL' },
      { student_id: studentProfileMap['emma.watson@edutrack.com'], title: 'Annual Athletics & Sports Levy', amount: 200.0, paid_amount: 0.0, due_date: '2025-12-15', status: 'UNPAID' },
      { student_id: studentProfileMap['michael.brown@edutrack.com'], title: 'Library & Technology Resources', amount: 180.0, paid_amount: 0.0, due_date: '2026-01-20', status: 'UNPAID' },
      { student_id: studentProfileMap['sophia.garcia@edutrack.com'], title: 'Annual Bus Transport Charge', amount: 450.0, paid_amount: 450.0, due_date: '2025-09-30', status: 'PAID' },
    ];

    for (const f of feesToSeed) {
      if (f.student_id) {
        await supabase.from('fees').insert({
          ...f,
          academic_session_id: sessionId,
          receipt_url: f.status === 'PAID' ? `https://receipts.edutrack.app/RECEIPT_DEMO_${Date.now().toString().slice(-4)}.pdf` : null,
        });
      }
    }
    console.log('✅ Seeded fee invoices.');

    // ------------------------------------------------------------------------
    // 9. SMART ALERTS & NOTIFICATION MATRIX
    // ------------------------------------------------------------------------
    console.log('🔔 Seeding Smart Alert Engine Matrix & Live Alerts...');

    // Seed default matrix rules
    await supabase.from('notification_rules').upsert([
      { event_type: 'STUDENT_ABSENCE', severity: 'LOW', notify_parent: true, notify_teacher: true, notify_admin: false, notify_super_admin: false, escalation_threshold: 1, escalate_after_hours: 24, is_enabled: true },
      { event_type: 'REPEATED_ABSENCE', severity: 'HIGH', notify_parent: true, notify_teacher: true, notify_admin: true, notify_super_admin: false, escalation_threshold: 2, escalate_after_hours: 12, is_enabled: true },
      { event_type: 'STUDENT_INCIDENT', severity: 'CRITICAL', notify_parent: true, notify_teacher: true, notify_admin: true, notify_super_admin: true, escalation_threshold: 1, escalate_after_hours: 6, is_enabled: true },
      { event_type: 'GRADE_DROP', severity: 'MEDIUM', notify_parent: false, notify_teacher: true, notify_admin: true, notify_super_admin: false, escalation_threshold: 15, escalate_after_hours: 48, is_enabled: true },
      { event_type: 'FACILITY_ISSUE', severity: 'MEDIUM', notify_parent: false, notify_teacher: false, notify_admin: true, notify_super_admin: false, escalation_threshold: 1, escalate_after_hours: 24, is_enabled: true },
    ], { onConflict: 'event_type' });

    // Seed live active alerts across levels 1, 2, and 3 for all roles
    const liveAlerts = [
      // 1. Super Admin Alerts (Level 3)
      {
        event_type: 'STUDENT_INCIDENT',
        title: 'Chemical Storage Cabinet Safety Inspection',
        message: 'Hazardous material storage cabinet door unlocked in Science Lab B. Requires immediate Super Admin clearance.',
        severity: 'CRITICAL',
        target_role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        escalation_level: 3,
        deduplication_key: 'DEMO_CRITICAL_001',
      },
      {
        event_type: 'FACILITY_ISSUE',
        title: 'Server Room Main Generator Backup Fault',
        message: 'Secondary power generator reported low oil pressure during automatic weekly test.',
        severity: 'HIGH',
        target_role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        escalation_level: 3,
        deduplication_key: 'DEMO_CRITICAL_002',
      },
      // 2. Admin Alerts (Level 2)
      {
        event_type: 'REPEATED_ABSENCE',
        title: 'Escalated Absence Warning: David Miller',
        message: 'Student David Miller recorded absent for 3 consecutive days without valid guardian medical note.',
        severity: 'HIGH',
        target_role: 'ADMIN',
        status: 'ESCALATED',
        escalation_level: 2,
        deduplication_key: 'DEMO_HIGH_002',
      },
      {
        event_type: 'FACILITY_ISSUE',
        title: 'Facility Notice: Main Gym HVAC Maintenance',
        message: 'Air filter replacement scheduled for gym air handlers during weekend hours.',
        severity: 'MEDIUM',
        target_role: 'ADMIN',
        status: 'ACTIVE',
        escalation_level: 2,
        deduplication_key: 'DEMO_MED_003',
      },
      // 3. Teacher Alerts (Level 1)
      {
        event_type: 'GRADE_DROP',
        title: 'Academic Performance Risk: Chemistry 201',
        message: 'Class average on Quiz 2 dropped below 60%. Academic intervention recommended.',
        severity: 'MEDIUM',
        target_role: 'TEACHER',
        status: 'ACTIVE',
        escalation_level: 1,
        deduplication_key: 'DEMO_MED_004',
      },
      {
        event_type: 'MISSING_ASSIGNMENT',
        title: 'Pending Submissions Notice: Math 101 Assignment 2',
        message: '8 students have not submitted Math 101 Assignment 2 before the deadline.',
        severity: 'HIGH',
        target_role: 'TEACHER',
        status: 'ACTIVE',
        escalation_level: 1,
        deduplication_key: 'DEMO_HIGH_005',
      },
      // 4. Student Alerts (Level 1)
      {
        event_type: 'CLASS_WORK_ISSUE',
        title: 'Mid-Term Examination Timetable Released',
        message: 'The official schedule for 2025-2026 Mid-Term Examinations is now published in your portal.',
        severity: 'LOW',
        target_role: 'STUDENT',
        status: 'ACTIVE',
        escalation_level: 1,
        deduplication_key: 'DEMO_LOW_006',
      },
      {
        event_type: 'STUDENT_ABSENCE',
        title: 'Attendance Notice: Morning Roll Call',
        message: 'You were marked absent on today\'s morning roll call for Grade 10 - Section A.',
        severity: 'MEDIUM',
        target_role: 'STUDENT',
        target_user_id: userMap['alice.wong@edutrack.com'],
        status: 'ACTIVE',
        escalation_level: 1,
        deduplication_key: 'DEMO_MED_007',
      },
      // 5. Parent Alerts (Level 1)
      {
        event_type: 'STUDENT_ABSENCE',
        title: 'Student Absence Notice: Alice Wong',
        message: 'Alice Wong was marked absent on today\'s morning roll call for Grade 10 - Section A.',
        severity: 'LOW',
        target_role: 'PARENT',
        target_user_id: userMap['alice.wong@edutrack.com'],
        status: 'ACTIVE',
        escalation_level: 1,
        deduplication_key: 'DEMO_LOW_008',
      },
      {
        event_type: 'GRADE_DROP',
        title: 'Tuition Fee Due Reminder: Q1 Invoice',
        message: 'Q1 Tuition & Academic Fee invoice of PKR 1,500 is due for payment.',
        severity: 'MEDIUM',
        target_role: 'PARENT',
        target_user_id: userMap['parent.wong@edutrack.com'],
        status: 'ACTIVE',
        escalation_level: 1,
        deduplication_key: 'DEMO_MED_009',
      },
      // 6. Broadcast All Users Alert
      {
        event_type: 'FACILITY_ISSUE',
        title: 'Campus Portal System Maintenance Complete',
        message: 'ScholarFlow ERP database updates and alert escalation engine synchronization successfully applied.',
        severity: 'LOW',
        target_role: 'ALL',
        status: 'RESOLVED',
        escalation_level: 1,
        deduplication_key: 'DEMO_ALL_010',
      },
    ];

    for (const alt of liveAlerts) {
      await supabase.from('alerts').insert(alt);
    }
    console.log('✅ Seeded live Smart Alert Engine notifications.');

    // ------------------------------------------------------------------------
    // 10. AUDIT LOGS
    // ------------------------------------------------------------------------
    console.log('📋 Seeding Audit Logs...');
    const adminId = userMap['admin@edutrack.com'];
    if (adminId) {
      await supabase.from('audit_logs').insert([
        { user_id: adminId, action: 'TEACHER_CREATED', entity: 'User', payload: { name: 'John Smith', role: 'TEACHER' } },
        { user_id: adminId, action: 'ATTENDANCE_MARKED', entity: 'Attendance', payload: { date: new Date().toISOString().split('T')[0], count: 5 } },
        { user_id: adminId, action: 'FEE_INVOICE_CREATED', entity: 'Fee', payload: { amount: 1500, student: 'Alice Wong' } },
        { user_id: adminId, action: 'ALERT_ACKNOWLEDGED', entity: 'Alert', payload: { alertId: 'DEMO_LOW_003' } },
      ]);
    }
    console.log('✅ Seeded audit log trail.');

    console.log('\n🎉 MASTER DUMMY DATA SEED COMPLETE!');
    console.log('====================================================');
    console.log('👉 Available Demo Accounts (Password: mubashir7661):');
    console.log('   👑 Super Admin: superadmin@edutrack.com');
    console.log('   🛡️ Admin:       admin@edutrack.com');
    console.log('   👨‍🏫 Teacher:     john.smith@edutrack.com');
    console.log('   🎓 Student:     alice.wong@edutrack.com');
    console.log('   👪 Parent:      parent.wong@edutrack.com');
    console.log('====================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed with error:', err);
    process.exit(1);
  }
}

runSeeder();
