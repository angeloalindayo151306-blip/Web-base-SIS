const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ===========================
   CREATE SUBJECT
=========================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { subject_code, subject_name, description } = req.body;

    const { data, error } = await supabase
      .from('subjects')
      .insert([{ subject_code, subject_name, description }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ===========================
   GET ALL SUBJECTS
=========================== */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*');

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ===========================
   UPDATE SUBJECT
=========================== */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;
    const { subject_code, subject_name, description } = req.body;

    const { data, error } = await supabase
      .from('subjects')
      .update({ subject_code, subject_name, description })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ===========================
   DELETE SUBJECT
=========================== */
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