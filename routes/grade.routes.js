const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   CREATE GRADE (TEACHER ONLY)
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('teacher', 'admin'),
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
      .insert([
        {
          student_id,
          subject_id,
          teacher_id: teacherId,
          grade_value,
          grading_period,
          school_year_id: null,
        },
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   GET ALL GRADES (ADMIN)
====================================================== */
router.get(
  '/all',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { data, error } = await supabase
      .from('grades')
      .select('*');

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   UPDATE GRADE
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
   DELETE GRADE (ADMIN)
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

/* ======================================================
   STUDENT VIEW OWN GRADES
====================================================== */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('student'),
  async (req, res) => {
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    const { data: grades } = await supabase
      .from('grades')
      .select('*')
      .eq('student_id', student.id);

    let average = null;

    if (grades.length > 0) {
      const total = grades.reduce((sum, g) => sum + Number(g.grade_value), 0);
      average = (total / grades.length).toFixed(2);
    }

    res.json({
      message: 'Student grades retrieved ✅',
      data: grades,
      average_grade: average,
    });
  }
);

module.exports = router;