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

    // ✅ If teacher, auto-detect teacher_id
    if (req.user.role === 'teacher') {
      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (teacherError) {
        return res.status(400).json({ error: teacherError.message });
      }

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
          school_year_id: null
        }
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   GET ALL GRADES
   Admin → All
   Teacher → Own
   Student → Own
====================================================== */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {

    let query = supabase
      .from('grades')
      .select(`
        id,
        grade_value,
        grading_period,
        students(full_name),
        subjects(name),
        teachers(full_name)
      `);

    // ✅ Teacher sees only their grades
    if (req.user.role === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      query = query.eq('teacher_id', teacher.id);
    }

    // ✅ Student sees only their grades
    if (req.user.role === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      query = query.eq('student_id', student.id);
    }

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });

    // ✅ Format clean response for frontend
    const formatted = data.map(g => ({
      id: g.id,
      student_name: g.students?.full_name || '-',
      subject_name: g.subjects?.name || '-',
      teacher_name: g.teachers?.full_name || '-',
      grade_value: g.grade_value,
      grading_period: g.grading_period
    }));

    res.json(formatted);
  }
);

/* ======================================================
   UPDATE GRADE
   Admin & Teacher (Own Only)
====================================================== */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {
    const { id } = req.params;
    const { grade_value, grading_period } = req.body;

    // ✅ If teacher, restrict update to own grades
    if (req.user.role === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      const { data, error } = await supabase
        .from('grades')
        .update({ grade_value, grading_period })
        .eq('id', id)
        .eq('teacher_id', teacher.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      return res.json(data);
    }

    // ✅ Admin can update any
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
   Admin Only
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