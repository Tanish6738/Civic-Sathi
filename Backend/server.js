const http = require('http');
// Load environment first so downstream requires can see vars
require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./db/db');
const server = http.createServer(app);
connectDB();

server.listen(process.env.PORT || 3001, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT || 3001}`);
});