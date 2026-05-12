const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* =========================
   GET ALL PARENTS (ADMIN)
========================= */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { data, error } = await supabase
      .from('parents')
      .select(`
        id,
        first_name,
        last_name,
        users(full_name, email),
        parent_students(
          students(id, first_name, last_name)
        )
      `)
      .eq('is_deleted', false);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(p => ({
      id: p.id,
      full_name: p.users?.full_name || `${p.first_name} ${p.last_name}`,
      email: p.users?.email || '-',
      students: p.parent_students.map(ps => ({
        id: ps.students.id,
        name: `${ps.students.first_name} ${ps.students.last_name}`
      }))
    }));

    res.json(formatted);
  }
);

/* =========================
   UPDATE LINKED STUDENTS
========================= */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { id } = req.params;
    const { student_ids = [] } = req.body;

    await supabase.from('parent_students')
      .delete()
      .eq('parent_id', id);

    if (student_ids.length > 0) {
      const links = student_ids.map(sid => ({
        parent_id: id,
        student_id: sid
      }));

      await supabase.from('parent_students').insert(links);
    }

    res.json({ message: 'Parent updated ✅' });
  }
);

/* =========================
   PARENT DASHBOARD
========================= */
router.get(
  '/dashboard',
  authenticateToken,
  authorizeRoles('parent'),
  async (req, res) => {

    try {

      // ✅ Get parent profile
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (!parent) {
        return res.status(404).json({ error: 'Parent profile not found.' });
      }

      // ✅ Get linked students with course & department
      const { data: links } = await supabase
        .from('parent_students')
        .select(`
          student_id,
          students(
            id,
            first_name,
            last_name,
            courses(
              name,
              departments(name)
            )
          )
        `)
        .eq('parent_id', parent.id);

      const result = [];

      for (const link of links) {

        const student = link.students;

        // ✅ Get enrollments with subject info
        const { data: enrollments } = await supabase
          .from('offering_enrollments')
          .select(`
            id,
            subject_offerings(
              semester,
              subjects(name)
            )
          `)
          .eq('student_id', link.student_id);

        const enrollmentIds = (enrollments || []).map(e => e.id);

        // ✅ Attendance counts
        const { count: totalAttendance } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .in('offering_enrollment_id', enrollmentIds);

        const { count: presentCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .in('offering_enrollment_id', enrollmentIds)
          .eq('status', 'present');

        const percentage = totalAttendance > 0
          ? Math.round((presentCount / totalAttendance) * 100)
          : 0;

        // ✅ Safe subject list
        const subjects = (enrollments || []).map(e => ({
          name: e.subject_offerings?.subjects?.name || '-',
          semester: e.subject_offerings?.semester || '-'
        }));

        result.push({
          student_id: link.student_id,
          name: `${student.first_name} ${student.last_name}`,
          department: student?.courses?.departments?.name || '-',
          course: student?.courses?.name || '-',
          enrollment_status: subjects.length > 0 ? 'Enrolled' : 'Not Enrolled',
          semester: subjects[0]?.semester || '-',
          attendance_percentage: percentage,
          subjects: subjects || []
        });
      }

      res.json(result);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* =========================
   SOFT DELETE
========================= */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    await supabase
      .from('parents')
      .update({ is_deleted: true })
      .eq('id', req.params.id);

    res.json({ message: 'Parent deleted ✅' });
  }
);

module.exports = router;