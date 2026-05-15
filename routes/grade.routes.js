const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const router = express.Router();

/* ==========================================
GET ALL GRADES (ADMIN / TEACHER - FILTERED)
========================================== */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('teacher', 'admin'),
  async (req, res) => {
    try {
      // ✅ ADMIN sees everything
      if (req.user.role === 'admin') {
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
        return res.json(data);
      }

      // ✅ TEACHER – filter by ownership
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found.' });
      }

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
            subject_offerings!inner(
              teacher_id,
              semester,
              subjects(name)
            ),
            students(first_name, last_name)
          )
        `)
        .eq(
          'offering_enrollments.subject_offerings.teacher_id',
          teacher.id
        );

      if (error) return res.status(500).json({ error: error.message });

      res.json(data);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ==========================================
SAVE / UPDATE GRADE (TEACHER - SECURED)
========================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {
    try {
      const { offering_enrollment_id, prelim, midterm, finals } = req.body;

      // ✅ Get teacher
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found.' });
      }

      // ✅ Verify ownership
      const { data: enrollment } = await supabase
        .from('offering_enrollments')
        .select(`
          id,
          subject_offerings!inner(teacher_id)
        `)
        .eq('id', offering_enrollment_id)
        .single();

      if (
        !enrollment ||
        enrollment.subject_offerings.teacher_id !== teacher.id
      ) {
        return res.status(403).json({
          error: 'Unauthorized: Not your class.'
        });
      }

      // ✅ Check if locked
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

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ==========================================
LOCK GRADE (TEACHER - SECURED)
========================================== */
router.post(
  '/lock/:id',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // ✅ Get teacher
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found.' });
      }

      // ✅ Get grade with ownership
      const { data: grade } = await supabase
        .from('grades')
        .select(`
          id,
          offering_enrollments!inner(
            subject_offerings!inner(teacher_id)
          )
        `)
        .eq('id', id)
        .single();

      if (
        !grade ||
        grade.offering_enrollments.subject_offerings.teacher_id !== teacher.id
      ) {
        return res.status(403).json({
          error: 'Unauthorized: Not your class.'
        });
      }

      const { error } = await supabase
        .from('grades')
        .update({ is_locked: true })
        .eq('id', id);

      if (error) return res.status(500).json({ error: error.message });

      res.json({ message: 'Grade locked ✅' });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ==========================================
UNLOCK GRADE (ADMIN ONLY)
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