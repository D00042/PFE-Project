const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      role: user.role
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    // role hierarchy validation
const creatorRole = req.user.role;

if (creatorRole === "TEAM_LEADER" && role !== "MEMBER") {
  return res.status(403).json({
    message: "Team Leader can only create MEMBER accounts"
  });
}

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1,$2,$3)
       RETURNING id, email, role`,
      [email, hashedPassword, role]
    );

    res.json({
      message: "User created successfully ✅",
      user: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return res.status(400).json({
        message: "Email already exists"
      });
    }

    res.status(500).json({ message: "Server error" });
  }
};
// ================= LOGOUT =================
exports.logout = async (req, res) => {
  try {
    // With JWT, logout is handled on client side
    // Backend simply confirms authentication

    res.json({
      message: "Logout successful ✅"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
const crypto = require("crypto");

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (!userResult.rows.length) {
      return res.json({
        message: "If email exists, reset link sent"
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const expiration = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await pool.query(
      `UPDATE users
       SET reset_token=$1, reset_token_expiration=$2
       WHERE email=$3`,
      [resetToken, expiration, email]
    );

    // Normally send email here
    res.json({
      message: "Reset token generated ✅",
      resetToken
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    const result = await pool.query(
      `SELECT * FROM users
       WHERE reset_token=$1
       AND reset_token_expiration > NOW()`,
      [resetToken]
    );

    if (!result.rows.length) {
      return res.status(400).json({
        message: "Invalid or expired token"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
       SET password_hash=$1,
           reset_token=NULL,
           reset_token_expiration=NULL
       WHERE id=$2`,
      [hashedPassword, result.rows[0].id]
    );

    res.json({
      message: "Password reset successful ✅"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};