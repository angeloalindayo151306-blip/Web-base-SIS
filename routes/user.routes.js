const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* =========================
   CREATE USER
========================= */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { full_name, email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{
        full_name,
        email,
        password_hash: hashedPassword,
        role
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* =========================
   READ ALL USERS
========================= */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role');

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* =========================
   UPDATE USER
========================= */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;
    const { full_name, email, role } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({ full_name, email, role })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* =========================
   DELETE USER
========================= */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'User deleted ✅' });
  }
);

module.exports = router;