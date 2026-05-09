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
        subject_id,
        teacher_id,
        school_year_id,
        subjects(name),
        teachers(first_name, last_name),
        school_years(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

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
        error: 'Subject, Teacher, School Year, and Semester are required.'
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

    if (error) {

      // ✅ Friendly error for duplicate subject per semester
      if (error.message.includes('unique_subject_per_semester')) {
        return res.status(400).json({
          error: 'This subject already has an offering for this semester and school year.'
        });
      }

      // ✅ Friendly error for teacher schedule conflict
      if (error.message.includes('unique_teacher_schedule')) {
        return res.status(400).json({
          error: 'This teacher already has an offering for this subject and semester.'
        });
      }

      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  }
);

/* ==========================================
   DELETE OFFERING
========================================== */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { id } = req.params;

    const { error } = await supabase
      .from('subject_offerings')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Offering deleted ✅' });
  }
);

module.exports = router;