const cron = require('node-cron');
const supabase = require('./config/supabaseClient');

function startAttendanceAutoMarker() {
  // ✅ Runs every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏳ Running auto-absence check...');

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    try {
      // ✅ Get offerings that already ended today
      const { data: offerings } = await supabase
        .from('subject_offerings')
        .select('*')
        .lte('end_time', currentTime);

      if (!offerings || offerings.length === 0) return;

      for (const offering of offerings) {
        // ✅ Get enrolled students
        const { data: enrolledStudents } = await supabase
          .from('offering_enrollments')
          .select('student_id')
          .eq('subject_offering_id', offering.id);

        if (!enrolledStudents) continue;

        for (const enrollment of enrolledStudents) {
          const studentId = enrollment.student_id;

          // ✅ Check if attendance already exists
          const { data: existing } = await supabase
            .from('attendance')
            .select('id')
            .eq('student_id', studentId)
            .eq('subject_offering_id', offering.id)
            .eq('attendance_date', today)
            .maybeSingle();

          if (!existing) {
            // ✅ Insert Absent record
            await supabase.from('attendance').insert([
              {
                student_id: studentId,
                subject_offering_id: offering.id,
                attendance_date: today,
                status: 'Absent',
              },
            ]);

            console.log(`❌ Marked absent: ${studentId}`);
          }
        }
      }
    } catch (err) {
      console.error('Auto absence error:', err.message);
    }
  });
}

module.exports = startAttendanceAutoMarker;
