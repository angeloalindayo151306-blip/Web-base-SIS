const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ==========================================
   ADMIN DASHBOARD SUMMARY
========================================== */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    try {

      // ✅ Total Students
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // ✅ Total Teachers
      const { count: totalTeachers } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true });

      // ✅ Total Classes
      const { count: totalClasses } = await supabase
        .from('subject_offerings')
        .select('*', { count: 'exact', head: true });

      // ✅ Today's Attendance
      const today = new Date().toISOString().split('T')[0];

      const { count: presentToday } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('attendance_date', today)
        .eq('status', 'present');

      const { count: lateToday } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('attendance_date', today)
        .eq('status', 'late');

      res.json({
        totalStudents: totalStudents || 0,
        totalTeachers: totalTeachers || 0,
        totalClasses: totalClasses || 0,
        presentToday: presentToday || 0,
        lateToday: lateToday || 0
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;