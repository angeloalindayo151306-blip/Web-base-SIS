const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const router = express.Router();

/* =================================
ADD SUBJECT TO COURSE CURRICULUM
================================= */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { course_id, subject_id, year_level, semester } = req.body;

    if (!course_id || !subject_id || !year_level || !semester) {
      return res.status(400).json({ error: 'All fields required.' });
    }

    const { data, error } = await supabase
      .from('curriculum_subjects')
      .insert([{ course_id, subject_id, year_level, semester }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  }
);

/* =================================
GET CURRICULUM BY COURSE
================================= */
router.get(
  '/:courseId',
  authenticateToken,
  async (req, res) => {
    const { courseId } = req.params;

    const { data, error } = await supabase
      .from('curriculum_subjects')
      .select(`
        id,
        year_level,
        semester,
        subjects ( id, name )
      `)
      .eq('course_id', courseId);

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

module.exports = router;