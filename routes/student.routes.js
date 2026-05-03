const express = require('express');
const QRCode = require('qrcode');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   DELETE STUDENT
====================================================== */
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

/* ======================================================
   UPDATE STUDENT
====================================================== */
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
      course_id,
      year_level,
      section
    } = req.body;

    if (!student_number || !first_name || !last_name || !course_id) {
      return res.status(400).json({ error: 'Required fields missing.' });
    }

    const { data, error } = await supabase
      .from('students')
      .update({
        student_number,
        first_name,
        last_name,
        course_id,
        year_level,
        section,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   GET ALL STUDENTS (JOIN COURSE + DEPARTMENT)
====================================================== */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {

    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        student_number,
        first_name,
        last_name,
        year_level,
        section,
        qr_code_value,
        courses (
          id,
          name,
          departments (
            id,
            name
          )
        )
      `);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(s => ({
      id: s.id,
      student_number: s.student_number,
      full_name: `${s.first_name} ${s.last_name}`,
      year_level: s.year_level,
      section: s.section,
      course_name: s.courses?.name || '-',
      department_name: s.courses?.departments?.name || '-',
      qr_code_value: s.qr_code_value
    }));

    res.json(formatted);
  }
);

/* ======================================================
   CREATE STUDENT (WITH QR)
====================================================== */
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
      course_id,
      year_level,
      section
    } = req.body;

    if (!user_id || !student_number || !first_name || !last_name || !course_id) {
      return res.status(400).json({ error: 'Required fields missing.' });
    }

    const qr_code_value = `QR-${student_number}-${Date.now()}`;

    const { data, error } = await supabase
      .from('students')
      .insert([
        {
          user_id,
          student_number,
          first_name,
          last_name,
          course_id,
          year_level,
          section,
          qr_code_value,
          status: 'active'
        }
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const qr_image = await QRCode.toDataURL(qr_code_value);

    res.status(201).json({ student: data, qr_image });
  }
);

/* ======================================================
   DOWNLOAD QR
====================================================== */
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

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const { count: gradeCount } = await supabase
      .from('grades')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student.id);

    const { count: attendanceCount } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student.id);

    res.json({
      totals: {
        total_grades: gradeCount || 0,
        attendance_records: attendanceCount || 0
      }
    });
  }
);

module.exports = router;