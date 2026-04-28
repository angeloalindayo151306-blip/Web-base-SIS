const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   CREATE PARENT (ADMIN ONLY)
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { first_name, last_name, user_id } = req.body;

    const { data, error } = await supabase
      .from('parents')
      .insert([
        {
          first_name,
          last_name,
          user_id
        }
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   GET ALL PARENTS (ADMIN ONLY)
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
        users(email)
      `)
      .eq('is_deleted', false);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(p => ({
      id: p.id,
      full_name: `${p.first_name} ${p.last_name}`,
      email: p.users?.email || '-'
    }));

    res.json(formatted);
  }
);

/* ======================================================
   UPDATE PARENT
====================================================== */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name } = req.body;

    const { data, error } = await supabase
      .from('parents')
      .update({
        first_name,
        last_name,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
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
   PARENT VIEW LINKED GRADES (WITH JOINS)
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
        students(full_name),
        subjects(name),
        teachers(first_name, last_name)
      `)
      .in('student_id', studentIds);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(g => ({
      id: g.id,
      student_name: g.students?.full_name || '-',
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
   PARENT VIEW LINKED ATTENDANCE (WITH JOINS)
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
        students(full_name),
        subjects(name),
        teachers(first_name, last_name)
      `)
      .in('student_id', studentIds);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map(a => ({
      id: a.id,
      student_name: a.students?.full_name || '-',
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