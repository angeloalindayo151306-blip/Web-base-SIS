const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ===============================
   GET ALL COURSES (JOIN DEPARTMENT)
================================ */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {

    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        department_id,
        departments(name)
      `)
      .order('name');

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(c => ({
      id: c.id,
      name: c.name,
      department_id: c.department_id,
      department_name: c.departments?.name || '-'
    }));

    res.json(formatted);
  }
);

/* ===============================
   CREATE COURSE
================================ */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { name, department_id } = req.body;

    if (!name || !department_id) {
      return res.status(400).json({ error: 'Course name and department required.' });
    }

    const { data, error } = await supabase
      .from('courses')
      .insert([{ name, department_id }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  }
);

/* ===============================
   DELETE COURSE
================================ */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { id } = req.params;

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Course deleted ✅' });
  }
);

module.exports = router;