const express = require('express');
const supabase = require('../config/supabaseClient');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

router.post(
  '/scan',
  authenticateToken,
  authorizeRoles('teacher'),
  async (req, res) => {
    const { qr_code_value, subject_id, status } = req.body;

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('qr_code_value', qr_code_value)
      .single();

    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance')
      .insert([
        {
          student_id: student.id,
          subject_id,
          teacher_id: teacher.id,
          attendance_date: today,
          status,
        },
      ])
      .select();

    if (error) {
      // ✅ Handle duplicate attendance nicely
      if (error.message.includes('duplicate key value')) {
        return res.status(400).json({
          error: 'Attendance already recorded for today',
        });
      }

      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  }
);

module.exports = router;
