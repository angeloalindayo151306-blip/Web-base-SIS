const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
GET CURRICULUM BY COURSE
====================================================== */
router.get(
  '/:courseId',
  authenticateToken,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      const { data, error } = await supabase
        .from('curriculum_subjects')
        .select(`
          id,
          year_level,
          semester,
          subjects ( id, name )
        `)
        .eq('course_id', courseId)
        .order('year_level', { ascending: true });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json(data);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ======================================================
ADD SUBJECT TO CURRICULUM
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const { course_id, subject_id, year_level, semester } = req.body;

      if (!course_id || !subject_id || !year_level || !semester) {
        return res.status(400).json({ error: 'All fields required.' });
      }

      const { error } = await supabase
        .from('curriculum_subjects')
        .insert([{
          course_id,
          subject_id,
          year_level,
          semester
        }]);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ message: 'Subject added to curriculum ✅' });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ======================================================
DELETE CURRICULUM ENTRY
====================================================== */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('curriculum_subjects')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ message: 'Curriculum entry removed ✅' });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;