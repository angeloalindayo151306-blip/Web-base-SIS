const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

/* ======================================================
   CREATE ATTENDANCE (ADMIN / TEACHER)
====================================================== */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  async (req, res) => {
    const { student_id, attendance_date, status } = req.body;

    const { data, error } = await supabase
      .from('attendance')
      .insert([{ student_id, attendance_date, status }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  }
);

/* ======================================================
   GET ATTENDANCE
   Admin → All
   Student → Own
====================================================== */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {
    try {
      let query = supabase
        .from('attendance')
        .select(`
          id,
          attendance_date,
          status,
          students(first_name, last_name)
        `);

      // ✅ If student → show only their attendance
      if (req.user.role === 'student') {
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', req.user.id)
          .single();

        if (studentError) {
          return res.status(400).json({ error: studentError.message });
        }

        query = query.eq('student_id', student.id);
      }

      // ✅ Admin sees all (no filter)

      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const formatted = data.map(a => ({
        id: a.id,
        student_name: a.students
          ? `${a.students.first_name} ${a.students.last_name}`
          : '-',
        attendance_date: a.attendance_date,
        status: a.status
      }));

      res.json(formatted);

    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

/* ======================================================
   UPDATE ATTENDANCE (ADMIN ONLY)
====================================================== */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const { id } = req.params;
    const { attendance_date, status } = req.body;

    const { data, error } = await supabase
      .from('attendance')
      .update({ attendance_date, status })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
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

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Attendance deleted ✅' });
  }
);

module.exports = router;