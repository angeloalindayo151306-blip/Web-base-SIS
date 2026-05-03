const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   ASSIGN STUDENTS TO SUBJECT
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { subject_id, student_ids } = req.body;

    if (!subject_id || !student_ids || student_ids.length === 0) {
      return res.status(400).json({ error: 'Subject and students required.' });
    }

    const records = student_ids.map(student_id => ({
      subject_id,
      student_id
    }));

    const { error } = await supabase
      .from('subject_students')
      .insert(records);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Students assigned ✅' });
  }
);

/* ======================================================
   GET STUDENTS BY SUBJECT
====================================================== */
router.get(
  '/:subjectId',
  authenticateToken,
  async (req, res) => {

    const { subjectId } = req.params;

    const { data, error } = await supabase
      .from('subject_students')
      .select(`
        students(id, first_name, last_name)
      `)
      .eq('subject_id', subjectId);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(r => ({
      id: r.students.id,
      name: `${r.students.first_name} ${r.students.last_name}`
    }));

    res.json(formatted);
  }
);

module.exports = router;