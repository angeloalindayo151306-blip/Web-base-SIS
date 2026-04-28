const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   GET ALL SCHOOL YEARS
====================================================== */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {

    const { data, error } = await supabase
      .from('school_years')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   SET ACTIVE SCHOOL YEAR (ADMIN ONLY)
   Ensures only ONE active at a time
====================================================== */
router.put(
  '/set-active/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { id } = req.params;

    // ✅ First remove active from all
    await supabase
      .from('school_years')
      .update({ is_active: false });

    // ✅ Set selected one active
    const { error } = await supabase
      .from('school_years')
      .update({ is_active: true })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Active school year updated ✅' });
  }
);

/* ======================================================
   GET ACTIVE SCHOOL YEAR
====================================================== */
router.get(
  '/active',
  authenticateToken,
  async (req, res) => {

    const { data, error } = await supabase
      .from('school_years')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) return res.status(404).json({ error: 'No active school year found' });

    res.json(data);
  }
);

module.exports = router;