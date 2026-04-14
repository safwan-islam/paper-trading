const http = require("http");
const dotenv = require("dotenv");

dotenv.config();

const { connectDB } = require("./config/db");
const app = require("./app");
const { initializeSocket } = require("./socket");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        const server = http.createServer(app);
        initializeSocket(server);

        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.log("Failed to start server: ", error);
        process.exit(1);
    }
};

startServer();
