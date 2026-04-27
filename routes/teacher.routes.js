const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   CREATE TEACHER
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { full_name, email, user_id } = req.body;

    const { data, error } = await supabase
      .from('teachers')
      .insert([{ full_name, email, user_id }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   GET ALL TEACHERS
====================================================== */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {
    const { data, error } = await supabase
      .from('teachers')
      .select('*');

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   UPDATE TEACHER
====================================================== */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;
    const { full_name, email } = req.body;

    const { data, error } = await supabase
      .from('teachers')
      .update({ full_name, email })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   DELETE TEACHER
====================================================== */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Teacher deleted ✅' });
  }
);

/* ======================================================
   TEACHER DASHBOARD
====================================================== */
router.get(
  '/dashboard',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    const grades = await supabase
      .from('grades')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacher.id);

    const attendance = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacher.id);

    res.json({
      message: 'Teacher dashboard ✅',
      totals: {
        grades_encoded: grades.count || 0,
        attendance_recorded: attendance.count || 0,
      },
    });
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
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

module.exports = router;