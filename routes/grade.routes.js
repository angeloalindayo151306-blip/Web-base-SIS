const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   CREATE GRADE (STRICT ENROLLMENT + OWNERSHIP)
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {

    const { student_id, subject_id, grade_value, grading_period } = req.body;

    if (!student_id || !subject_id || !grade_value || !grading_period) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    let teacherId = null;

    if (req.user.role === 'teacher') {

      // ✅ Get teacher ID
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found.' });
      }

      teacherId = teacher.id;

      // ✅ Verify subject belongs to teacher
      const { data: subject } = await supabase
        .from('subjects')
        .select('id')
        .eq('id', subject_id)
        .eq('teacher_id', teacherId)
        .single();

      if (!subject) {
        return res.status(403).json({
          error: 'You are not assigned to this subject.'
        });
      }
    }

    // ✅ Verify student enrollment
    const { data: enrollment } = await supabase
      .from('subject_students')
      .select('*')
      .eq('subject_id', subject_id)
      .eq('student_id', student_id)
      .single();

    if (!enrollment) {
      return res.status(400).json({
        error: 'Student is not enrolled in this subject.'
      });
    }

    // ✅ Insert grade
    const { data, error } = await supabase
      .from('grades')
      .insert([
        {
          student_id,
          subject_id,
          teacher_id: teacherId,
          grade_value,
          grading_period
        }
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  }
);

/* ======================================================
   GET GRADES
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
        students(first_name, last_name),
        subjects(name),
        teachers(first_name, last_name)
      `);

    if (req.user.role === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      query = query.eq('teacher_id', teacher.id);
    }

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

    const formatted = data.map(g => ({
      id: g.id,
      student_name: g.students
        ? `${g.students.first_name} ${g.students.last_name}`
        : '-',
      subject_name: g.subjects?.name || '-',
      teacher_name: g.teachers
        ? `${g.teachers.first_name} ${g.teachers.last_name}`
        : '-',
      grade_value: g.grade_value,
      grading_period: g.grading_period
    }));

    res.json(formatted);
  }
);

/* ======================================================
   UPDATE GRADE (ADMIN OR OWNER)
====================================================== */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {

    const { id } = req.params;
    const { grade_value, grading_period } = req.body;

    if (!grade_value || !grading_period) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

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
   DELETE GRADE (ADMIN ONLY)
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