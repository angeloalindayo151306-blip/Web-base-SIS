const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
GET AVAILABLE OFFERINGS FOR STUDENT
====================================================== */
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

      // 3️⃣ Get offerings
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
ENROLL STUDENT (ASSIGN COURSE + AUTO ENROLL SUBJECTS)
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const { student_id, course_id, year_level, semester } = req.body;

      if (!student_id || !course_id || !year_level || !semester) {
        return res.status(400).json({ error: 'All fields required.' });
      }

      // ✅ Update student record
      const { error: updateError } = await supabase
        .from('students')
        .update({
          course_id,
          year_level
        })
        .eq('id', student_id);

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      // ✅ Get curriculum subjects
      const { data: curriculum, error: curriculumError } = await supabase
        .from('curriculum_subjects')
        .select('subject_id')
        .eq('course_id', course_id)
        .eq('year_level', year_level)
        .eq('semester', semester);

      if (curriculumError) {
        return res.status(500).json({ error: curriculumError.message });
      }

      if (!curriculum || curriculum.length === 0) {
        return res.json({ message: 'No curriculum subjects found.' });
      }

      const subjectIds = curriculum.map(c => c.subject_id);

      // ✅ Get subject offerings
      const { data: offerings, error: offeringError } = await supabase
        .from('subject_offerings')
        .select('id')
        .in('subject_id', subjectIds)
        .eq('semester', semester);

      if (offeringError) {
        return res.status(500).json({ error: offeringError.message });
      }

      if (!offerings || offerings.length === 0) {
        return res.json({ message: 'No subject offerings available.' });
      }

      const records = offerings.map(o => ({
        student_id,
        offering_id: o.id
      }));

      const { error: insertError } = await supabase
        .from('offering_enrollments')
        .insert(records);

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }

      res.json({ message: 'Student successfully enrolled ✅' });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ======================================================
GET ALL ENROLLMENTS
====================================================== */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('offering_enrollments')
        .select(`
          id,
          students ( id, first_name, last_name ),
          subject_offerings (
            semester,
            subjects ( name ),
            school_years ( name )
          )
        `);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const formatted = data.map(e => ({
        id: e.id,
        student_name: `${e.students.first_name} ${e.students.last_name}`,
        subject_name: e.subject_offerings?.subjects?.name || '-',
        semester: e.subject_offerings?.semester || '-',
        school_year: e.subject_offerings?.school_years?.name || '-'
      }));

      res.json(formatted);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ======================================================
DELETE ENROLLMENT
====================================================== */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('offering_enrollments')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ message: 'Enrollment removed ✅' });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;