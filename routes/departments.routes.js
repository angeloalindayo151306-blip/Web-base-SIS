const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ===============================
   GET ALL DEPARTMENTS
================================ */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ===============================
   CREATE DEPARTMENT
================================ */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Department name required' });
    }

    const { data, error } = await supabase
      .from('departments')
      .insert([{ name }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  }
);

/* ===============================
   DELETE DEPARTMENT
================================ */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Department deleted ✅' });
  }
);

module.exports = router;