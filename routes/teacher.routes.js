const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   GET ALL TEACHERS (ADMIN)
====================================================== */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id,
        first_name,
        last_name,
        department,
        users(email)
      `)
      .eq('is_deleted', false);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(t => ({
      id: t.id,
      full_name: `${t.first_name} ${t.last_name}`,
      email: t.users?.email || '-',
      department: t.department || '-'
    }));

    res.json(formatted);
  }
);

/* ======================================================
   TEACHER DASHBOARD (NORMALIZED VERSION)
====================================================== */
router.get(
  '/dashboard',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {

    try {

      // ✅ Get teacher profile
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id, first_name, last_name, department')
        .eq('user_id', req.user.id)
        .single();

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found.' });
      }

      // ✅ Get subject offerings handled by teacher
      const { data: offerings } = await supabase
        .from('subject_offerings')
        .select(`
          id,
          semester,
          subjects(name),
          offering_enrollments(id)
        `)
        .eq('teacher_id', teacher.id);

      const offeringIds = (offerings || []).map(o => o.id);

      // ✅ Count grades linked to teacher offerings
      const { data: enrollments } = await supabase
        .from('offering_enrollments')
        .select('id')
        .in('offering_id', offeringIds);

      const enrollmentIds = (enrollments || []).map(e => e.id);

      const { count: gradeCount } = await supabase
        .from('grades')
        .select('*', { count: 'exact', head: true })
        .in('offering_enrollment_id', enrollmentIds);

      const { count: attendanceCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .in('offering_enrollment_id', enrollmentIds);

      const result = (offerings || []).map(o => ({
        offering_id: o.id,
        subject: o.subjects?.name || '-',
        semester: o.semester,
        total_students: o.offering_enrollments?.length || 0
      }));

      res.json({
        profile: {
          full_name: `${teacher.first_name} ${teacher.last_name}`,
          department: teacher.department || '-'
        },
        totals: {
          subjects: result.length,
          grades: gradeCount || 0,
          attendance: attendanceCount || 0
        },
        classes: result
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ======================================================
   GET TEACHER PROFILE
====================================================== */
router.get(
  '/profile',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {

    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id,
        first_name,
        last_name,
        department,
        users(email)
      `)
      .eq('user_id', req.user.id)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      id: data.id,
      full_name: `${data.first_name} ${data.last_name}`,
      email: data.users?.email || '-',
      department: data.department || '-'
    });
  }
);

module.exports = router;