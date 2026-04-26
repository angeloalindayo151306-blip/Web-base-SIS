const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

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
