const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   RECORD ATTENDANCE (AUTO STATUS LOGIC)
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {

    const { student_id, subject_offering_id } = req.body;

    if (!student_id || !subject_offering_id) {
      return res.status(400).json({
        error: 'Student and subject offering are required.'
      });
    }

    try {

      let teacherId = null;

      /* ✅ VERIFY TEACHER OWNERSHIP */
      if (req.user.role === 'teacher') {

        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', req.user.id)
          .single();

        if (!teacher) {
          return res.status(404).json({
            error: 'Teacher profile not found.'
          });
        }

        teacherId = teacher.id;

        const { data: offeringCheck } = await supabase
          .from('subject_offerings')
          .select('id')
          .eq('id', subject_offering_id)
          .eq('teacher_id', teacherId)
          .single();

        if (!offeringCheck) {
          return res.status(403).json({
            error: 'You are not assigned to this subject offering.'
          });
        }
      }

      /* ✅ VERIFY STUDENT ENROLLMENT */
      const { data: enrollment } = await supabase
        .from('offering_enrollments')
        .select('*')
        .eq('student_id', student_id)
        .eq('subject_offering_id', subject_offering_id)
        .single();

      if (!enrollment) {
        return res.status(400).json({
          error: 'Student is not enrolled in this subject offering.'
        });
      }

      /* ✅ GET OFFERING SCHEDULE */
      const { data: offering } = await supabase
        .from('subject_offerings')
        .select('start_time, end_time, late_threshold_minutes')
        .eq('id', subject_offering_id)
        .single();

      if (!offering) {
        return res.status(404).json({
          error: 'Subject offering schedule not found.'
        });
      }

      /* ✅ DETERMINE STATUS AUTOMATICALLY */
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const classStart = new Date(`${today}T${offering.start_time}`);
      const classEnd = new Date(`${today}T${offering.end_time}`);

      const lateLimit = new Date(
        classStart.getTime() + (offering.late_threshold_minutes || 15) * 60000
      );

      let finalStatus = 'Absent';

      if (now <= lateLimit) {
        finalStatus = 'Present';
      } else if (now > lateLimit && now <= classEnd) {
        finalStatus = 'Late';
      } else {
        finalStatus = 'Absent';
      }

      /* ✅ INSERT ATTENDANCE */
      const { data, error } = await supabase
        .from('attendance')
        .insert([
          {
            student_id,
            subject_offering_id,
            attendance_date: today,
            status: finalStatus
          }
        ])
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          error: error.message
        });
      }

      res.status(201).json(data);

    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

/* ======================================================
   GET ATTENDANCE (ROLE FILTERED)
====================================================== */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {

    let query = supabase
      .from('attendance')
      .select(`
        id,
        attendance_date,
        status,
        students(first_name, last_name),
        subject_offerings(
          semester,
          year_level,
          subjects(name),
          teachers(first_name, last_name),
          school_years(name)
        )
      `);

    /* ✅ TEACHER FILTER */
    if (req.user.role === 'teacher') {

      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      query = query.eq('subject_offerings.teacher_id', teacher.id);
    }

    /* ✅ STUDENT FILTER */
    if (req.user.role === 'student') {

      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      query = query.eq('student_id', student.id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    const formatted = data.map(a => ({
      id: a.id,
      student_name: a.students
        ? `${a.students.first_name} ${a.students.last_name}`
        : '-',
      subject_name: a.subject_offerings?.subjects?.name || '-',
      teacher_name: a.subject_offerings?.teachers
        ? `${a.subject_offerings.teachers.first_name} ${a.subject_offerings.teachers.last_name}`
        : '-',
      school_year: a.subject_offerings?.school_years?.name || '-',
      semester: a.subject_offerings?.semester || '-',
      attendance_date: a.attendance_date,
      status: a.status
    }));

    res.json(formatted);
  }
);

/* ======================================================
   DELETE ATTENDANCE (ADMIN ONLY)
====================================================== */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { id } = req.params;

    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Attendance deleted ✅' });
  }
);

module.exports = router;