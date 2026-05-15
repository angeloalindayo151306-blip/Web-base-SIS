const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ==========================================
GET TODAY CLASS STATUS (ADMIN / TEACHER)
========================================== */
router.get(
  '/class-status/:offering_id',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {

    const { offering_id } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const { data: enrollments, error: enrollError } = await supabase
      .from('offering_enrollments')
      .select(`
        id,
        students(first_name, last_name)
      `)
      .eq('offering_id', offering_id);

    if (enrollError) {
      return res.status(500).json({ error: enrollError.message });
    }

    const enrollmentIds = enrollments.map(e => e.id);

    const { data: attendanceToday } = await supabase
      .from('attendance')
      .select('offering_enrollment_id')
      .in('offering_enrollment_id', enrollmentIds)
      .eq('attendance_date', today);

    const presentIds = attendanceToday.map(a => a.offering_enrollment_id);

    const result = enrollments.map(e => ({
      enrollment_id: e.id,
      first_name: e.students?.first_name,
      last_name: e.students?.last_name,
      present: presentIds.includes(e.id)
    }));

    res.json({
      total: enrollments.length,
      present: presentIds.length,
      students: result
    });
  }
);

/* ==========================================
MARK ATTENDANCE (TEACHER)
========================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {

    const { qr_code_value, offering_id } = req.body;

    if (!qr_code_value || !offering_id) {
      return res.status(400).json({
        error: 'QR and offering required.'
      });
    }

    const { data: student } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('qr_code_value', qr_code_value)
      .single();

    if (!student) {
      return res.status(404).json({
        error: 'Student not found.'
      });
    }

    const { data: enrollment } = await supabase
      .from('offering_enrollments')
      .select('id')
      .eq('student_id', student.id)
      .eq('offering_id', offering_id)
      .single();

    if (!enrollment) {
      return res.status(400).json({
        error: 'Student not enrolled in this class.'
      });
    }

    const today = new Date().toISOString().split('T')[0];

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
      if (error.code === '23505') {
        return res.status(400).json({
          error: 'Already marked today.'
        });
      }

      return res.status(500).json({
        error: error.message
      });
    }

    res.json({
      message: `${student.first_name} ${student.last_name} marked present.`
    });
  }
);

/* ==========================================
GET ATTENDANCE FOR LOGGED-IN STUDENT
========================================== */
router.get(
  '/student/me',
  authenticateToken,
  authorizeRoles('student'),
  async (req, res) => {
    try {
      const user_id = req.user.id;

      // ✅ Get student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user_id)
        .single();

      if (studentError || !student) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      // ✅ Get attendance records
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          attendance_date,
          status,
          offering_enrollments(
            subject_offerings(
              semester,
              subjects(name)
            )
          )
        `)
        .eq('offering_enrollments.student_id', student.id);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json(data);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;