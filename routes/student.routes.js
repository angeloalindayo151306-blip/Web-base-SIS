const express = require('express');
const QRCode = require('qrcode');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Student deleted ✅' });
  }
);

router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;

    const {
      student_number,
      first_name,
      last_name,
      course,
      year_level,
      section
    } = req.body;

    const { data, error } = await supabase
      .from('students')
      .update({
        student_number,
        first_name,
        last_name,
        course,
        year_level,
        section
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {
    const { data, error } = await supabase
      .from('students')
      .select('*');

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

// Create student with QR
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const {
      user_id,
      student_number,
      first_name,
      last_name,
      course,
      year_level,
      section,
    } = req.body;

    const qr_code_value = `QR-${student_number}-${Date.now()}`;

    const { data, error } = await supabase
      .from('students')
      .insert([
        {
          user_id,
          student_number,
          first_name,
          last_name,
          course,
          year_level,
          section,
          qr_code_value,
          status: 'active',
        },
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const qr_image = await QRCode.toDataURL(qr_code_value);

    res.json({ student: data, qr_image });
  }
);

// Download QR
router.get(
  '/:studentId/qr',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {
    const { studentId } = req.params;

    const { data: student } = await supabase
      .from('students')
      .select('first_name, last_name, qr_code_value')
      .eq('id', studentId)
      .single();

    const qrBuffer = await QRCode.toBuffer(student.qr_code_value);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${student.first_name}_${student.last_name}_QR.png`
    );

    res.send(qrBuffer);
  }
);

/* ======================================================
   STUDENT DASHBOARD
====================================================== */

router.get(
  '/dashboard',
  authenticateToken,
  authorizeRoles('student'),
  async (req, res) => {
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    const grades = await supabase
      .from('grades')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student.id);

    const attendance = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student.id);

    res.json({
      message: 'Student dashboard ✅',
      totals: {
        total_grades: grades.count || 0,
        attendance_records: attendance.count || 0,
      },
    });
  }
);

module.exports = router;
