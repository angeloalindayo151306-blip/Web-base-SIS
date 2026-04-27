const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   CREATE GRADE
   Admin & Teacher
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {
    const { student_id, subject_id, grade_value, grading_period } = req.body;

    let teacherId = null;

    if (req.user.role === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      teacherId = teacher.id;
    }

    const { data, error } = await supabase
      .from('grades')
      .insert([{
        student_id,
        subject_id,
        teacher_id: teacherId,
        grade_value,
        grading_period,
        school_year_id: null
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   GET ALL GRADES
   Admin can see ALL
   Teacher sees their own
   Student sees own
====================================================== */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {

    if (req.user.role === 'admin') {
      const { data, error } = await supabase
        .from('grades')
        .select('*');

      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (req.user.role === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('teacher_id', teacher.id);

      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (req.user.role === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', student.id);

      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    res.status(403).json({ error: 'Access denied' });
  }
);

/* ======================================================
   UPDATE GRADE
   Admin & Teacher
====================================================== */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {
    const { id } = req.params;
    const { grade_value, grading_period } = req.body;

    const { data, error } = await supabase
      .from('grades')
      .update({ grade_value, grading_period })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   DELETE GRADE
   Admin only
====================================================== */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
      .from('grades')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Grade deleted ✅' });
  }
);

module.exports = router;