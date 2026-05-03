const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ===============================
   GET ALL COURSES WITH DEPARTMENT
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
      department_name: c.departments?.name || '-'
    }));

    res.json(formatted);
  }
);

module.exports = router;