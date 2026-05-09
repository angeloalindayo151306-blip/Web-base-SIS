const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ==========================================
   GET ALL ENROLLMENTS
========================================== */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {

    const { data, error } = await supabase
      .from('offering_enrollments')   // ✅ FIXED TABLE NAME
      .select(`
        id,
        students(first_name, last_name),
        subject_offerings(
          semester,
          subjects(name),
          school_years(name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(e => ({
      id: e.id,
      student_name: `${e.students.first_name} ${e.students.last_name}`,
      subject_name: e.subject_offerings.subjects.name,
      school_year: e.subject_offerings.school_years.name,
      semester: e.subject_offerings.semester
    }));

    res.json(formatted);
  }
);

/* ==========================================
   CREATE ENROLLMENT
========================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { student_id, offering_id } = req.body; // ✅ MATCH DB COLUMN

    if (!student_id || !offering_id) {
      return res.status(400).json({
        error: 'Student and offering required.'
      });
    }

    const { data, error } = await supabase
      .from('offering_enrollments')  // ✅ FIXED TABLE NAME
      .insert([{ student_id, offering_id }])
      .select()
      .single();

    if (error) {

      if (error.code === '23505') {
        return res.status(400).json({
          error: 'Student already enrolled in this offering.'
        });
      }

      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  }
);

/* ==========================================
   DELETE ENROLLMENT
========================================== */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { id } = req.params;

    const { error } = await supabase
      .from('offering_enrollments')  // ✅ FIXED TABLE NAME
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Enrollment removed ✅' });
  }
);

module.exports = router;