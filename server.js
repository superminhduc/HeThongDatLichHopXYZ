const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

// Kết nối MySQL
require("./config/db");

// Import route nhân viên
const employeeRoutes = require("./routes/employeeRoutes");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

// Route trang chủ
app.get("/", (req, res) => {
    res.send("<h1>Meeting Scheduling System</h1>");
});

// Route nhân viên
app.use("/employees", employeeRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running: http://localhost:${PORT}`);
});