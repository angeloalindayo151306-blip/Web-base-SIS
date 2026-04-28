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

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check duplicate email
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{
        full_name,
        email,
        password_hash: hashedPassword,
        role,
        is_active: true
      }])
      .select('id, full_name, email, role, is_active')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
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
      .select('id, full_name, email, role, is_active')
      .order('created_at', { ascending: false });

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
    const { full_name, email, role, is_active } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({
        full_name,
        email,
        role,
        is_active,
        updated_at: new Date()
      })
      .eq('id', id)
      .select('id, full_name, email, role, is_active')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* =========================
   RESET PASSWORD
========================= */
router.put(
  '/:id/reset-password',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password required.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from('users')
      .update({
        password_hash: hashed,
        updated_at: new Date()
      })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Password reset successfully ✅' });
  }
);

/* =========================
   DEACTIVATE USER (Soft Delete)
========================= */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .update({
        is_active: false,
        updated_at: new Date()
      })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'User deactivated ✅' });
  }
);

module.exports = router;