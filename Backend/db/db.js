const mongoose = require("mongoose");

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI not set in environment. Create a .env file (see .env.example)." );
        process.exit(1);
    }
    try {
        await mongoose.connect(uri);
        try {
            const sanitized = uri.replace(/:\\S+@/, ':****@');
            console.log("MongoDB connected:", sanitized.split('@').pop().split('?')[0]);
        } catch { console.log("MongoDB connected"); }
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
