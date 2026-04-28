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
    const { name, teacher_id, school_year_id, semester } = req.body;

    const { data, error } = await supabase
      .from('subjects')
      .insert([
        {
          name,
          teacher_id: teacher_id || null,
          school_year_id,
          semester
        }
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   GET ALL SUBJECTS (WITH RELATIONS)
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
        teachers(first_name, last_name),
        school_years(name)
      `)
      .eq('is_deleted', false);

    if (error) return res.status(500).json({ error: error.message });

    // ✅ Format clean response
    const formatted = data.map(s => ({
      id: s.id,
      name: s.name,
      semester: s.semester,
      teacher_name: s.teachers
        ? `${s.teachers.first_name} ${s.teachers.last_name}`
        : 'Unassigned',
      school_year: s.school_years?.name || '-'
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
    const { name, teacher_id, school_year_id, semester } = req.body;

    const { data, error } = await supabase
      .from('subjects')
      .update({
        name,
        teacher_id: teacher_id || null,
        school_year_id,
        semester,
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
   DELETE SUBJECT (SOFT DELETE)
====================================================== */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
      .from('subjects')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Subject deleted ✅ (soft delete)' });
  }
);

module.exports = router;