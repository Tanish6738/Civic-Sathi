const express = require('express');
const app = express();
const cors = require('cors');
const userRoutes = require('../routes/userRoutes');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);


module.exports = app;