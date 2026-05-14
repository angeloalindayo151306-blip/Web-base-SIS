const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ==========================================
GET AVAILABLE OFFERINGS FOR STUDENT
(MUST BE ABOVE "/:subjectId")
========================================== */
router.get(
  '/available-offerings/:studentId',
  authenticateToken,
  async (req, res) => {
    try {
      const { studentId } = req.params;

      // 1️⃣ Get student course + year level
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('course_id, year_level')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // 2️⃣ Get curriculum subjects
      const { data: curriculum, error: curriculumError } = await supabase
        .from('curriculum_subjects')
        .select('subject_id')
        .eq('course_id', student.course_id)
        .eq('year_level', student.year_level);

      if (curriculumError) {
        return res.status(500).json({ error: curriculumError.message });
      }

      if (!curriculum || curriculum.length === 0) {
        return res.json([]);
      }

      const subjectIds = curriculum.map(c => c.subject_id);

      // 3️⃣ Get subject offerings
      const { data: offerings, error: offeringError } = await supabase
        .from('subject_offerings')
        .select(`
          id,
          semester,
          subjects ( name ),
          school_years ( name )
        `)
        .in('subject_id', subjectIds);

      if (offeringError) {
        return res.status(500).json({ error: offeringError.message });
      }

      const formatted = offerings.map(o => ({
        id: o.id,
        subject_name: o.subjects?.name || '-',
        school_year: o.school_years?.name || '-',
        semester: o.semester
      }));

      res.json(formatted);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ======================================================
ASSIGN STUDENTS TO SUBJECT
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
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

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ======================================================
GET STUDENTS BY SUBJECT
====================================================== */
router.get(
  '/:subjectId',
  authenticateToken,
  async (req, res) => {
    try {
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

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;