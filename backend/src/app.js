const express = require("express");
const cors = require("cors");

const authRoutes = require("./auth/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

const { authMiddleware } = require("./auth/auth.middleware");

app.get(
  "/dashboard",
  authMiddleware(["MANAGER"]),
  (req, res) => {
    res.json({
      message: "Welcome Manager Dashboard 🚀",
      user: req.user
    });
  }
);


module.exports = app;