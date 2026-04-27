const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   CREATE PARENT (ADMIN ONLY)
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { full_name, email, user_id } = req.body;

    const { data, error } = await supabase
      .from('parents')
      .insert([{ full_name, email, user_id }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   GET ALL PARENTS (ADMIN ONLY)
====================================================== */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { data, error } = await supabase
      .from('parents')
      .select('*');

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   UPDATE PARENT
====================================================== */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;
    const { full_name, email } = req.body;

    const { data, error } = await supabase
      .from('parents')
      .update({ full_name, email })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   DELETE PARENT
====================================================== */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
      .from('parents')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Parent deleted ✅' });
  }
);

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
      .select('*')
      .in('student_id', studentIds);

    res.json(grades);
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
      .select('*')
      .in('student_id', studentIds);

    res.json(data);
  }
);

module.exports = router;