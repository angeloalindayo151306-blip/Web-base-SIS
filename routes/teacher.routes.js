const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   GET ALL TEACHERS (ADMIN)
====================================================== */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id,
        first_name,
        last_name,
        department,
        users(email)
      `)
      .eq('is_deleted', false);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(t => ({
      id: t.id,
      full_name: `${t.first_name} ${t.last_name}`,
      email: t.users?.email || '-',
      department: t.department || '-'
    }));

    res.json(formatted);
  }
);

/* ======================================================
   TEACHER DASHBOARD (NORMALIZED VERSION)
====================================================== */
router.get(
  '/dashboard',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {

    try {

      // ✅ Get teacher profile
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id, first_name, last_name, department')
        .eq('user_id', req.user.id)
        .single();

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found.' });
      }

      // ✅ Get subject offerings handled by teacher
      const { data: offerings } = await supabase
        .from('subject_offerings')
        .select(`
          id,
          semester,
          subjects(name),
          offering_enrollments(id)
        `)
        .eq('teacher_id', teacher.id);

      const offeringIds = (offerings || []).map(o => o.id);

      // ✅ Count grades linked to teacher offerings
      const { data: enrollments } = await supabase
        .from('offering_enrollments')
        .select('id')
        .in('offering_id', offeringIds);

      const enrollmentIds = (enrollments || []).map(e => e.id);

      const { count: gradeCount } = await supabase
        .from('grades')
        .select('*', { count: 'exact', head: true })
        .in('offering_enrollment_id', enrollmentIds);

      const { count: attendanceCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .in('offering_enrollment_id', enrollmentIds);

      const result = (offerings || []).map(o => ({
        offering_id: o.id,
        subject: o.subjects?.name || '-',
        semester: o.semester,
        total_students: o.offering_enrollments?.length || 0
      }));

      // ✅ Compute total students handled
const totalStudentsHandled = result.reduce(
  (sum, c) => sum + c.total_students,
  0
);

res.json({
  profile: {
    full_name: `${teacher.first_name} ${teacher.last_name}`,
    department: teacher.department || '-'
  },
  totals: {
    subjects: result.length,
    students: totalStudentsHandled,   // ✅ ADD THIS
    grades: gradeCount || 0,
    attendance: attendanceCount || 0
  },
  classes: result
});

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ======================================================
   GET TEACHER PROFILE
====================================================== */
router.get(
  '/profile',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {

    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id,
        first_name,
        last_name,
        department,
        users(email)
      `)
      .eq('user_id', req.user.id)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      id: data.id,
      full_name: `${data.first_name} ${data.last_name}`,
      email: data.users?.email || '-',
      department: data.department || '-'
    });
  }
);

/* ==========================================
GET STUDENTS PER OFFERING (WITH GRADES)
========================================== */
router.get(
  '/offering/:id/students',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {
    try {
  
      const { id } = req.params;
  
      // ✅ Get teacher
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();
  
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found.' });
      }
  
      // ✅ Verify offering belongs to teacher
      const { data: offering } = await supabase
        .from('subject_offerings')
        .select('id')
        .eq('id', id)
        .eq('teacher_id', teacher.id)
        .single();
  
      if (!offering) {
        return res.status(403).json({ error: 'Unauthorized class.' });
      }
  
      // ✅ Get enrollments + student info
      const { data: enrollments, error } = await supabase
        .from('offering_enrollments')
        .select(`
          id,
          students(
            id,
            first_name,
            last_name,
            year_level,
            block,
            qr_code_value
          )
        `)
        .eq('offering_id', id);
  
      if (error) {
        return res.status(500).json({ error: error.message });
      }
  
      if (!enrollments || enrollments.length === 0) {
        return res.json([]);
      }
  
      // ✅ Get grades separately
      const enrollmentIds = enrollments.map(e => e.id);
  
      const { data: grades } = await supabase
        .from('grades')
        .select(`
          id,
          offering_enrollment_id,
          prelim,
          midterm,
          finals,
          final_grade,
          status,
          is_locked
        `)
        .in('offering_enrollment_id', enrollmentIds);
  
      // ✅ Attach grades manually
      const result = enrollments.map(e => ({
        ...e,
        grades: grades
          ? grades.filter(g => g.offering_enrollment_id === e.id)
          : []
      }));
  
      res.json(result);
  
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

/* ==========================================
GET ATTENDANCE PER OFFERING + DATE
========================================== */
router.get(
  '/offering/:id/attendance',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ error: 'Date is required.' });
      }

      // ✅ Get teacher
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found.' });
      }

      // ✅ Verify offering belongs to teacher
      const { data: offering } = await supabase
        .from('subject_offerings')
        .select('id')
        .eq('id', id)
        .eq('teacher_id', teacher.id)
        .single();

      if (!offering) {
        return res.status(403).json({ error: 'Unauthorized class.' });
      }

      // ✅ Get students + attendance for date
      const { data, error } = await supabase
        .from('offering_enrollments')
        .select(`
          id,
          students(first_name, last_name),
          attendance(
            id,
            attendance_date,
            status
          )
        `)
        .eq('offering_id', id)
        .eq('attendance.attendance_date', date);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json(data);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ==========================================
SAVE ATTENDANCE (TEACHER)
========================================== */
router.post(
  '/attendance',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {
    try {

      const { offering_enrollment_id, attendance_date, status } = req.body;

      if (!offering_enrollment_id || !attendance_date || !status) {
        return res.status(400).json({ error: 'Missing fields.' });
      }

      const { error } = await supabase
        .from('attendance')
        .upsert(
          [{
            offering_enrollment_id,
            attendance_date,
            status
          }],
          {
            onConflict: 'offering_enrollment_id,attendance_date'
          }
        );

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ message: 'Attendance saved ✅' });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ==========================================
SCAN QR ATTENDANCE (TEACHER)
========================================== */
router.post(
  '/attendance/scan',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {
    try {
      const { qr_code_value, offering_id, attendance_date } = req.body;

      if (!qr_code_value || !offering_id || !attendance_date) {
        return res.status(400).json({ error: 'Missing fields.' });
      }

      // ✅ Get teacher
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found.' });
      }

      // ✅ Verify offering belongs to teacher
      const { data: offering } = await supabase
        .from('subject_offerings')
        .select('id')
        .eq('id', offering_id)
        .eq('teacher_id', teacher.id)
        .single();

      if (!offering) {
        return res.status(403).json({ error: 'Unauthorized class.' });
      }

      // ✅ Find student by QR
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('qr_code_value', qr_code_value)
        .single();

      if (!student) {
        return res.status(404).json({ error: 'Invalid QR code.' });
      }

      // ✅ Check enrollment
      const { data: enrollment } = await supabase
        .from('offering_enrollments')
        .select('id')
        .eq('offering_id', offering_id)
        .eq('student_id', student.id)
        .single();

      if (!enrollment) {
        return res.status(403).json({ error: 'Student not enrolled in this class.' });
      }

      // ✅ Insert attendance
const { error } = await supabase
.from('attendance')
.upsert(
  [{
    offering_enrollment_id: enrollment.id,
    attendance_date,
    status: 'present'
  }],
  {
    onConflict: 'offering_enrollment_id,attendance_date'
  }
);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ message: 'Attendance recorded ✅' });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;