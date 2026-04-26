const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password_hash: hashedPassword, role }])
      .select();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

module.exports = router;
