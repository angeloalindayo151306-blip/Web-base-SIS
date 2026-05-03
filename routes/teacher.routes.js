const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   CREATE TEACHER
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { first_name, last_name, user_id, department } = req.body;

    if (!first_name || !last_name || !user_id || !department) {
      return res.status(400).json({
        error: 'All fields are required.'
      });
    }

    const { data: existing } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (existing) {
      return res.status(400).json({
        error: 'This teacher user is already linked.'
      });
    }

    const { data, error } = await supabase
      .from('teachers')
      .insert([
        {
          first_name,
          last_name,
          user_id,
          department,
          is_deleted: false
        }
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  }
);

/* ======================================================
   GET ALL TEACHERS
====================================================== */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {

    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id,
        first_name,
        last_name,
        department,
        user_id,
        users(email, full_name)
      `)
      .eq('is_deleted', false);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(t => ({
      id: t.id,
      full_name: `${t.first_name} ${t.last_name}`,
      email: t.users?.email || '-',
      department: t.department || '-'
    }));

    res.json(formatted);
  }
);

/* ======================================================
   UPDATE TEACHER
====================================================== */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, department } = req.body;

    if (!first_name || !last_name || !department) {
      return res.status(400).json({
        error: 'All fields are required.'
      });
    }

    const { data, error } = await supabase
      .from('teachers')
      .update({
        first_name,
        last_name,
        department,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   DELETE TEACHER (SOFT DELETE)
====================================================== */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { id } = req.params;

    const { error } = await supabase
      .from('teachers')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Teacher deleted ✅ (soft delete)' });
  }
);

/* ======================================================
   TEACHER DASHBOARD (UPGRADED)
====================================================== */
router.get(
  '/dashboard',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {

    // ✅ Get teacher profile
    const { data: teacher } = await supabase
      .from('teachers')
      .select(`
        id,
        first_name,
        last_name,
        department,
        users(email)
      `)
      .eq('user_id', req.user.id)
      .single();

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found.' });
    }

    // ✅ Get assigned subjects
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, semester')
      .eq('teacher_id', teacher.id);

    // ✅ Count grades
    const { count: gradeCount } = await supabase
      .from('grades')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacher.id);

    // ✅ Count attendance
    const { count: attendanceCount } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacher.id);

    // ✅ Unique students handled
    const { data: students } = await supabase
      .from('grades')
      .select('student_id')
      .eq('teacher_id', teacher.id);

    const uniqueStudents = [...new Set(students.map(s => s.student_id))];

    res.json({
      profile: {
        full_name: `${teacher.first_name} ${teacher.last_name}`,
        email: teacher.users?.email || '-',
        department: teacher.department || '-'
      },
      totals: {
        subjects: subjects.length,
        students: uniqueStudents.length,
        grades: gradeCount || 0,
        attendance: attendanceCount || 0
      },
      subjects
    });
  }
);
/* ======================================================
   GET TEACHER PROFILE
====================================================== */
router.get(
  '/profile',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {

    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id,
        first_name,
        last_name,
        department,
        users(email)
      `)
      .eq('user_id', req.user.id)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      id: data.id,
      full_name: `${data.first_name} ${data.last_name}`,
      email: data.users?.email || '-',
      department: data.department || '-'
    });
  }
);

module.exports = router;