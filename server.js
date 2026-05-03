const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const studentRoutes = require('./routes/student.routes');
const gradeRoutes = require('./routes/grade.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const teacherRoutes = require('./routes/teacher.routes');
const parentRoutes = require('./routes/parent.routes');
const subjectRoutes = require('./routes/subject.routes');
const schoolYearRoutes = require('./routes/schoolYear.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');
const departmentRoutes = require('./routes/departments.routes');
const courseRoutes = require('./routes/courses.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('SIS Backend Running ✅');
});

// ✅ API ROUTES
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/teachers', teacherRoutes);   // also fixed for consistency
app.use('/api/parents', parentRoutes);     // ✅ FIXED HERE
app.use('/api/subjects', subjectRoutes);
app.use('/api/school-years', schoolYearRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/courses', courseRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});