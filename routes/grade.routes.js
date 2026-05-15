const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ==========================================
GET ALL GRADES (ADMIN / TEACHER)
========================================== */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('teacher', 'admin'),
  async (req, res) => {
    const { data, error } = await supabase
      .from('grades')
      .select(`
        id,
        prelim,
        midterm,
        finals,
        final_grade,
        status,
        is_locked,
        offering_enrollments(
          id,
          students(first_name, last_name),
          subject_offerings(
            semester,
            subjects(name)
          )
        )
      `);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  }
);

/* ==========================================
GET GRADES FOR LOGGED-IN STUDENT
========================================== */
router.get(
  '/student/me',
  authenticateToken,
  authorizeRoles('student'),
  async (req, res) => {
    try {
      const user_id = req.user.id;

      // ✅ Get student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user_id)
        .single();

      if (studentError || !student) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      // ✅ Get grades
      const { data, error } = await supabase
        .from('grades')
        .select(`
          prelim,
          midterm,
          finals,
          final_grade,
          status,
          offering_enrollments(
            subject_offerings(
              semester,
              subjects(name)
            )
          )
        `)
        .eq('offering_enrollments.student_id', student.id);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json(data);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ==========================================
SAVE / UPDATE GRADE (TEACHER)
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

    const { data: existing } = await supabase
      .from('grades')
      .select('is_locked')
      .eq('offering_enrollment_id', offering_enrollment_id)
      .single();

    if (existing?.is_locked) {
      return res.status(403).json({
        error: 'Grade is locked. Contact admin.'
      });
    }

    const p = Number(prelim || 0);
    const m = Number(midterm || 0);
    const f = Number(finals || 0);

    const final_grade = Math.round((p + m + f) / 3);
    const status = final_grade >= 75 ? 'Passed' : 'Failed';

    const { data, error } = await supabase
      .from('grades')
      .upsert([{
        offering_enrollment_id,
        prelim: p,
        midterm: m,
        finals: f,
        final_grade,
        status,
        is_locked: false
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  }
);

/* ==========================================
LOCK GRADE (TEACHER)
========================================== */
router.post(
  '/lock/:id',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
      .from('grades')
      .update({ is_locked: true })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Grade locked ✅' });
  }
);

/* ==========================================
UNLOCK GRADE (ADMIN)
========================================== */
router.post(
  '/unlock/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
      .from('grades')
      .update({ is_locked: false })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Grade unlocked ✅' });
  }
);

module.exports = router;