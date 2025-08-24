const http = require('http');
const app = require('./src/app');
const connectDB = require('./db/db');
const server = http.createServer(app);
const {config} = require('dotenv');
config();
connectDB();

server.listen(process.env.PORT || 3001, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT || 3001}`);
});