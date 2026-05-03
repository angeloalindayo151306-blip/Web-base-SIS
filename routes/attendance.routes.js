const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   CREATE ATTENDANCE (STRICT ENROLLMENT + OWNERSHIP)
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {

    const { student_id, subject_id, status, date } = req.body;

    if (!student_id || !subject_id || !status || !date) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    let teacherId = null;

    if (req.user.role === 'teacher') {

      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      teacherId = teacher.id;

      // ✅ Verify subject ownership
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

    // ✅ Verify enrollment
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

    const { data, error } = await supabase
      .from('attendance')
      .insert([
        {
          student_id,
          subject_id,
          teacher_id: teacherId,
          status,
          date
        }
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  }
);

/* ======================================================
   GET ATTENDANCE
====================================================== */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {

    let query = supabase
      .from('attendance')
      .select(`
        id,
        status,
        created_at,
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

    const formatted = data.map(a => ({
      id: a.id,
      student_name: a.students
        ? `${a.students.first_name} ${a.students.last_name}`
        : '-',
      subject_name: a.subjects?.name || '-',
      teacher_name: a.teachers
        ? `${a.teachers.first_name} ${a.teachers.last_name}`
        : '-',
      status: a.status,
      date: a.created_at
    }));

    res.json(formatted);
  }
);

module.exports = router;