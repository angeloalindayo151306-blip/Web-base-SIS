const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ==========================================
   GET ALL OFFERINGS
========================================== */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {

    const { data, error } = await supabase
      .from('subject_offerings')
      .select(`
        id,
        semester,
        start_time,
        end_time,
        subjects(name),
        teachers(first_name, last_name),
        school_years(name)
      `);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(o => ({
      id: o.id,
      subject_name: o.subjects?.name || '-',
      teacher_name: o.teachers
        ? `${o.teachers.first_name} ${o.teachers.last_name}`
        : '-',
      school_year: o.school_years?.name || '-',
      semester: o.semester,
      start_time: o.start_time,
      end_time: o.end_time
    }));

    res.json(formatted);
  }
);

/* ==========================================
   CREATE OFFERING
========================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const {
      subject_id,
      teacher_id,
      school_year_id,
      semester,
      start_time,
      end_time
    } = req.body;

    if (!subject_id || !teacher_id || !school_year_id || !semester) {
      return res.status(400).json({
        error: 'Required fields missing.'
      });
    }

    const { data, error } = await supabase
      .from('subject_offerings')
      .insert([{
        subject_id,
        teacher_id,
        school_year_id,
        semester,
        start_time,
        end_time
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  }
);

module.exports = router;