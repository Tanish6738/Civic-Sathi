const express = require('express');
const app = express();
const cors = require('cors');
const userRoutes = require('../routes/userRoutes');
const reportRoutes = require('../routes/reportRoutes');
const categoryRoutes = require('../routes/categoryRoutes');
const actionRoutes = require('../routes/actionRoutes');
const auditLogRoutes = require('../routes/auditLogRoutes');
const departmentRoutes = require('../routes/departmentRoutes');
const adminRoutes = require('../routes/adminRoutes');
const officerRoutes = require('../routes/officerRoutes');
const notificationRoutes = require('../routes/notificationRoutes');

const { attachUser } = require('../middleware/auth');
const requestId = require('../middleware/requestId');
const { snapshot } = require('../utils/metrics');

// Explicit CORS configuration so production (Render) always returns headers even on errors

const corsOptions = {
	origin: ("*"),
	credentials: true,
	};

app.use(cors(corsOptions));
// Ensure preflight responses always sent with correct headers
app.use(requestId);
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
app.use('/api/admin', adminRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/notifications', notificationRoutes);

// Metrics (basic JSON) - could secure with admin middleware if desired
app.get('/api/_metrics', (req, res) => {
	res.json({ success: true, data: snapshot() });
});


module.exports = app;