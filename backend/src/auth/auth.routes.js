const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");
const { authMiddleware } = require("./auth.middleware");
console.log("authController =", require("./auth.controller"));

router.post("/login", authController.login);
router.post(
  "/logout",
  authMiddleware(), // any authenticated user
  authController.logout
);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post(
  "/register",
  authMiddleware(["MANAGER", "TEAM_LEADER"]),
  authController.register
);


module.exports = router;