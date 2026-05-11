const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ==========================================
   GET ATTENDANCE BY OFFERING
========================================== */
router.get(
  '/:offering_id/:date',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {

    const { offering_id, date } = req.params;

    const { data, error } = await supabase
      .from('attendance')
      .select(`
        id,
        status,
        attendance_date,
        offering_enrollments(
          students(first_name, last_name)
        )
      `)
      .eq('attendance_date', date)
      .eq('offering_enrollments.offering_id', offering_id);

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ==========================================
   MARK ATTENDANCE (QR READY)
========================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {

    const { qr_code_value, offering_id } = req.body;

    if (!qr_code_value || !offering_id) {
      return res.status(400).json({ error: 'QR and offering required.' });
    }

    // ✅ Find student by QR
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('qr_code_value', qr_code_value)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // ✅ Check enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('offering_enrollments')
      .select('id')
      .eq('student_id', student.id)
      .eq('offering_id', offering_id)
      .single();

    if (enrollError || !enrollment) {
      return res.status(400).json({ error: 'Student not enrolled in this class.' });
    }

    const today = new Date().toISOString().split('T')[0];

    // ✅ Insert attendance
    const { error: insertError } = await supabase
      .from('attendance')
      .insert([{
        offering_enrollment_id: enrollment.id,
        attendance_date: today,
        status: 'present'
      }]);

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(400).json({ error: 'Already marked today.' });
      }
      return res.status(500).json({ error: insertError.message });
    }

    res.json({
      message: `${student.first_name} ${student.last_name} marked present.`
    });
  }
);

module.exports = router;