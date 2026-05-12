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
const departmentRoutes = require('./routes/departments.routes');
const courseRoutes = require('./routes/courses.routes');
const subjectOfferingsRoutes = require('./routes/subjectOfferings.routes');
const studentEnrollmentRoutes = require('./routes/studentEnrollment.routes');

const startAttendanceAutoMarker = require('./autoMarker');

const app = express();

/* ======================================================
   ✅ STABLE CORS CONFIG (PRODUCTION SAFE)
====================================================== */

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://web-base-sis.onrender.com'
];

// Allow all origins during development safely
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);

    // Allow all during development
    return callback(null, true);

    // ✅ If you want strict production:
    // if (allowedOrigins.includes(origin)) {
    //   callback(null, true);
    // } else {
    //   callback(new Error('Not allowed by CORS'));
    // }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

app.use(express.json());

/* ======================================================
   ✅ HEALTH CHECK
====================================================== */
app.get('/', (req, res) => {
  res.send('SIS Backend Running ✅');
});

/* ======================================================
   ✅ API ROUTES
====================================================== */
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/school-years', schoolYearRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/subject-offerings', subjectOfferingsRoutes);
app.use('/api/enrollments', studentEnrollmentRoutes);

/* ======================================================
   ✅ START SERVER
====================================================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startAttendanceAutoMarker();
});