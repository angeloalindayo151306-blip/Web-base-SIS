const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const router = express.Router();

/* =========================
GET ALL PARENTS
========================= */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { data, error } = await supabase
      .from('parents')
      .select(`
        id,
        first_name,
        last_name,
        users(full_name, email),
        parent_students(
          students(id, first_name, last_name)
        )
      `)
      .eq('is_deleted', false);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(p => ({
      id: p.id,
      full_name: p.users?.full_name || `${p.first_name} ${p.last_name}`,
      email: p.users?.email || '-',
      students: p.parent_students.map(ps => ({
        id: ps.students.id,
        name: `${ps.students.first_name} ${ps.students.last_name}`
      }))
    }));

    res.json(formatted);
  }
);

/* =========================
UPDATE LINKED STUDENTS
========================= */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;
    const { student_ids = [] } = req.body;

    await supabase.from('parent_students')
      .delete()
      .eq('parent_id', id);

    if (student_ids.length > 0) {
      const links = student_ids.map(sid => ({
        parent_id: id,
        student_id: sid
      }));

      await supabase.from('parent_students').insert(links);
    }

    res.json({ message: 'Parent updated ✅' });
  }
);

/* =========================
SOFT DELETE
========================= */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    await supabase
      .from('parents')
      .update({ is_deleted: true })
      .eq('id', req.params.id);

    res.json({ message: 'Parent deleted ✅' });
  }
);

module.exports = router;