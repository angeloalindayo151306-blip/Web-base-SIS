const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   ADMIN DASHBOARD
====================================================== */

router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const [students, teachers, parents, subjects, grades, attendance] =
      await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('teachers').select('*', { count: 'exact', head: true }),
        supabase.from('parents').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('grades').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }),
      ]);

    res.json({
      message: 'Admin dashboard ✅',
      totals: {
        students: students.count || 0,
        teachers: teachers.count || 0,
        parents: parents.count || 0,
        subjects: subjects.count || 0,
        grades: grades.count || 0,
        attendance_records: attendance.count || 0,
      },
    });
  }
);

module.exports = router;
