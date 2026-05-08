const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* =========================
CREATE USER + AUTO PROFILE
========================= */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const { full_name, email, password, role } = req.body;

      if (!full_name || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required.' });
      }

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: 'Email already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([{
          full_name,
          email,
          password_hash: hashedPassword,
          role,
          is_active: true
        }])
        .select()
        .single();

      if (userError) {
        return res.status(500).json({ error: userError.message });
      }

      const nameParts = full_name.trim().split(/\s+/);
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(' ') || '-';

      if (role === 'parent') {
        await supabase.from('parents').insert([{
          user_id: newUser.id,
          first_name,
          last_name,
          is_deleted: false
        }]);
      }

      if (role === 'teacher') {
        await supabase.from('teachers').insert([{
          user_id: newUser.id,
          first_name,
          last_name
        }]);
      }

      if (role === 'student') {
        await supabase.from('students').insert([{
          user_id: newUser.id,
          first_name,
          last_name,
          status: 'active'
        }]);
      }

      res.status(201).json(newUser);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

/* =========================
READ USERS
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
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  }
);

/* =========================
DEACTIVATE USER
========================= */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;

    await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id);

    res.json({ message: 'User deactivated ✅' });
  }
);

module.exports = router;