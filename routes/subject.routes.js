const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ===============================
   GET ALL SUBJECTS (JOIN COURSE + DEPARTMENT)
================================ */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {

    const { data, error } = await supabase
      .from('subjects')
      .select(`
        id,
        name,
        course_id,
        courses (
          id,
          name,
          departments (
            id,
            name
          )
        )
      `)
      .order('name');

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(s => ({
      id: s.id,
      name: s.name,
      course_id: s.course_id,
      course_name: s.courses?.name || '-',
      department_name: s.courses?.departments?.name || '-'
    }));

    res.json(formatted);
  }
);

/* ===============================
   CREATE SUBJECT
================================ */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { name, course_id } = req.body;

    if (!name || !course_id) {
      return res.status(400).json({ error: 'Name and course required.' });
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert([{ name, course_id }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  }
);

/* ===============================
   DELETE SUBJECT
================================ */
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