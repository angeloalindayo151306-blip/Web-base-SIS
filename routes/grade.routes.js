const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

// Encode grade
router.post(
  '/',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {
    const { student_id, subject_id, grade_value, grading_period } = req.body;

    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    const { data, error } = await supabase
      .from('grades')
      .insert([
        {
          student_id,
          subject_id,
          teacher_id: teacher.id,
          grade_value,
          grading_period,
          school_year_id: null,
        },
      ])
      .select();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
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
      .select('id, subject_id, grade_value, grading_period')
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
