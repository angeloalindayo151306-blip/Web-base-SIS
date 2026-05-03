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

module.exports = router;