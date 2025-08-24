const express = require('express');
const app = express();
const cors = require('cors');
const userRoutes = require('../routes/userRoutes');
const reportRoutes = require('../routes/reportRoutes');
const categoryRoutes = require('../routes/categoryRoutes');
const actionRoutes = require('../routes/actionRoutes');
const auditLogRoutes = require('../routes/auditLogRoutes');
const departmentRoutes = require('../routes/departmentRoutes');

const { attachUser } = require('../middleware/auth');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach user (if header provided)
app.use(attachUser);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/departments', departmentRoutes);


module.exports = app;