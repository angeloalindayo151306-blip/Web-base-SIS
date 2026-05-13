const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ==========================================
   GET GRADES (TEACHER VIEW)
========================================== */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('teacher', 'admin'),
  async (req, res) => {

    try {

      const { data, error } = await supabase
        .from('grades')
        .select(`
          id,
          prelim,
          midterm,
          finals,
          final_grade,
          offering_enrollments(
            id,
            students(first_name, last_name),
            subject_offerings(
              semester,
              subjects(name)
            )
          )
        `);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const formatted = data.map(g => ({
        id: g.id,
        student_name: `${g.offering_enrollments?.students?.first_name || ''} ${g.offering_enrollments?.students?.last_name || ''}`,
        subject_name: g.offering_enrollments?.subject_offerings?.subjects?.name || '-',
        semester: g.offering_enrollments?.subject_offerings?.semester || '-',
        prelim: g.prelim,
        midterm: g.midterm,
        finals: g.finals,
        final_grade: g.final_grade
      }));

      res.json(formatted);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ==========================================
   SAVE / UPDATE GRADE
========================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {

    const {
      offering_enrollment_id,
      prelim,
      midterm,
      finals
    } = req.body;

    if (!offering_enrollment_id) {
      return res.status(400).json({
        error: 'Enrollment ID required.'
      });
    }

    const final_grade =
      (Number(prelim || 0) +
       Number(midterm || 0) +
       Number(finals || 0)) / 3;

    const { data, error } = await supabase
      .from('grades')
      .upsert([{
        offering_enrollment_id,
        prelim,
        midterm,
        finals,
        final_grade
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  }
);

module.exports = router;