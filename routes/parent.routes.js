const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   CREATE PARENT + LINK STUDENTS
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { first_name, last_name, user_id, student_ids = [] } = req.body;

    // ✅ Insert Parent
    const { data: parent, error: parentError } = await supabase
      .from('parents')
      .insert([{ first_name, last_name, user_id }])
      .select()
      .single();

    if (parentError) {
      return res.status(500).json({ error: parentError.message });
    }

    // ✅ Insert Linking Records
    if (student_ids.length > 0) {
      const links = student_ids.map(student_id => ({
        parent_id: parent.id,
        student_id
      }));

      const { error: linkError } = await supabase
        .from('parent_students')
        .insert(links);

      if (linkError) {
        return res.status(500).json({ error: linkError.message });
      }
    }

    res.json({ message: 'Parent created ✅', parent });
  }
);

/* ======================================================
   GET ALL PARENTS (WITH LINKED STUDENTS)
====================================================== */
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
        users(email),
        parent_students(
          students(id, first_name, last_name)
        )
      `)
      .eq('is_deleted', false);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(p => ({
      id: p.id,
      full_name: `${p.first_name} ${p.last_name}`,
      email: p.users?.email || '-',
      students: p.parent_students.map(ps => ({
        id: ps.students.id,
        name: `${ps.students.first_name} ${ps.students.last_name}`
      }))
    }));

    res.json(formatted);
  }
);

/* ======================================================
   UPDATE PARENT + UPDATE STUDENT LINKS
====================================================== */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, student_ids = [] } = req.body;

    // ✅ Update Parent
    const { error: updateError } = await supabase
      .from('parents')
      .update({
        first_name,
        last_name,
        updated_at: new Date()
      })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    // ✅ Remove old links
    await supabase
      .from('parent_students')
      .delete()
      .eq('parent_id', id);

    // ✅ Insert new links
    if (student_ids.length > 0) {
      const links = student_ids.map(student_id => ({
        parent_id: id,
        student_id
      }));

      const { error: linkError } = await supabase
        .from('parent_students')
        .insert(links);

      if (linkError) {
        return res.status(500).json({ error: linkError.message });
      }
    }

    res.json({ message: 'Parent updated ✅' });
  }
);

/* ======================================================
   DELETE PARENT (SOFT DELETE)
====================================================== */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {

    const { id } = req.params;

    const { error } = await supabase
      .from('parents')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Parent deleted ✅ (soft delete)' });
  }
);

/* ======================================================
   PARENT DASHBOARD
====================================================== */
router.get(
  '/dashboard',
  authenticateToken,
  authorizeRoles('parent'),
  async (req, res) => {

    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    const { data: linkedStudents } = await supabase
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', parent.id);

    const studentIds = linkedStudents.map(s => s.student_id);

    const grades = await supabase
      .from('grades')
      .select('*', { count: 'exact', head: true })
      .in('student_id', studentIds);

    const attendance = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .in('student_id', studentIds);

    res.json({
      message: 'Parent dashboard ✅',
      totals: {
        linked_students: studentIds.length,
        total_grades: grades.count || 0,
        attendance_records: attendance.count || 0
      }
    });
  }
);

/* ======================================================
   PARENT VIEW LINKED GRADES (FIXED)
====================================================== */
router.get(
  '/grades',
  authenticateToken,
  authorizeRoles('parent'),
  async (req, res) => {

    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    const { data: linkedStudents } = await supabase
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', parent.id);

    const studentIds = linkedStudents.map(s => s.student_id);

    const { data, error } = await supabase
      .from('grades')
      .select(`
        id,
        grade_value,
        grading_period,
        students(first_name, last_name),
        subjects(name),
        teachers(first_name, last_name)
      `)
      .in('student_id', studentIds);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(g => ({
      id: g.id,
      student_name: g.students
        ? `${g.students.first_name} ${g.students.last_name}`
        : '-',
      subject_name: g.subjects?.name || '-',
      teacher_name: g.teachers
        ? `${g.teachers.first_name} ${g.teachers.last_name}`
        : '-',
      grade_value: g.grade_value,
      grading_period: g.grading_period
    }));

    res.json(formatted);
  }
);

/* ======================================================
   PARENT VIEW LINKED ATTENDANCE (FIXED)
====================================================== */
router.get(
  '/attendance',
  authenticateToken,
  authorizeRoles('parent'),
  async (req, res) => {

    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    const { data: linkedStudents } = await supabase
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', parent.id);

    const studentIds = linkedStudents.map(s => s.student_id);

    const { data, error } = await supabase
      .from('attendance')
      .select(`
        id,
        status,
        date,
        students(first_name, last_name),
        subjects(name),
        teachers(first_name, last_name)
      `)
      .in('student_id', studentIds);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(a => ({
      id: a.id,
      student_name: a.students
        ? `${a.students.first_name} ${a.students.last_name}`
        : '-',
      subject_name: a.subjects?.name || '-',
      teacher_name: a.teachers
        ? `${a.teachers.first_name} ${a.teachers.last_name}`
        : '-',
      status: a.status,
      date: a.date
    }));

    res.json(formatted);
  }
);

module.exports = router;