const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   PARENT DASHBOARD
====================================================== */

router.get(
  '/dashboard',
  authenticateToken,
  authorizeRoles('parent'),
  async (req, res) => {
    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    const { data: linkedStudents } = await supabase
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', parent.id);

    const studentIds = linkedStudents.map((s) => s.student_id);

    const grades = await supabase
      .from('grades')
      .select('*', { count: 'exact', head: true })
      .in('student_id', studentIds);

    const attendance = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .in('student_id', studentIds);

    res.json({
      message: 'Parent dashboard ✅',
      totals: {
        linked_students: studentIds.length,
        total_grades: grades.count || 0,
        attendance_records: attendance.count || 0,
      },
    });
  }
);

/* ======================================================
   PARENT VIEW LINKED GRADES
====================================================== */

router.get(
  '/grades',
  authenticateToken,
  authorizeRoles('parent'),
  async (req, res) => {
    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    const { data: linkedStudents } = await supabase
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', parent.id);

    const studentIds = linkedStudents.map((s) => s.student_id);

    const { data: grades } = await supabase
      .from('grades')
      .select('student_id, subject_id, grade_value, grading_period')
      .in('student_id', studentIds);

    let average = null;

    if (grades.length > 0) {
      const total = grades.reduce((sum, g) => sum + Number(g.grade_value), 0);
      average = (total / grades.length).toFixed(2);
    }

    res.json({
      message: 'Parent linked grades retrieved ✅',
      data: grades,
      average_grade: average,
    });
  }
);

/* ======================================================
   PARENT VIEW LINKED ATTENDANCE
====================================================== */

router.get(
  '/attendance',
  authenticateToken,
  authorizeRoles('parent'),
  async (req, res) => {
    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    const { data: linkedStudents } = await supabase
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', parent.id);

    const studentIds = linkedStudents.map((s) => s.student_id);

    const { data } = await supabase
      .from('attendance')
      .select('student_id, subject_id, attendance_date, status')
      .in('student_id', studentIds);

    res.json({
      message: 'Parent linked attendance retrieved ✅',
      data,
    });
  }
);

module.exports = router;
