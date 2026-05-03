const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   CREATE SUBJECT
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { name, semester, teacher_id, school_year_id, course_id } = req.body;

    if (!name || !semester || !course_id) {
      return res.status(400).json({
        error: 'Subject name, semester and course are required.'
      });
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert([
        {
          name,
          semester,
          teacher_id: teacher_id || null,
          school_year_id,
          course_id
        }
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  }
);

/* ======================================================
   GET ALL SUBJECTS (JOIN COURSE)
====================================================== */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {

    const { data, error } = await supabase
      .from('subjects')
      .select(`
        id,
        name,
        semester,
        teacher_id,
        school_year_id,
        course_id,
        teachers(first_name, last_name),
        school_years(name),
        courses(name)
      `);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(s => ({
      id: s.id,
      name: s.name,
      semester: s.semester,
      teacher_id: s.teacher_id,
      school_year_id: s.school_year_id,
      course_id: s.course_id,
      teacher_name: s.teachers
        ? `${s.teachers.first_name} ${s.teachers.last_name}`
        : 'Unassigned',
      school_year: s.school_years?.name || '-',
      course_name: s.courses?.name || '-'
    }));

    res.json(formatted);
  }
);

/* ======================================================
   UPDATE SUBJECT
====================================================== */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { id } = req.params;
    const { name, semester, teacher_id, school_year_id, course_id } = req.body;

    if (!name || !semester || !course_id) {
      return res.status(400).json({
        error: 'Subject name, semester and course are required.'
      });
    }

    const { data, error } = await supabase
      .from('subjects')
      .update({
        name,
        semester,
        teacher_id: teacher_id || null,
        school_year_id,
        course_id,
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
   DELETE SUBJECT
====================================================== */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { id } = req.params;

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Subject deleted ✅' });
  }
);

module.exports = router;