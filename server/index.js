const express = require("express");
const mysql = require("mysql");
const morgan = require("morgan");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const cors = require("cors");
const otp_html = require("./OTP_HTML");
dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "sql_injection",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL");
});

app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  // Check for empty fields
  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check password length
  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters long" });
  }

  // Check if email already exists
  const checkEmailQuery = "SELECT * FROM users WHERE email = ?";
  db.query(checkEmailQuery, [email], (emailErr, emailResults) => {
    if (emailErr) {
      console.error("Error checking email:", emailErr);
      return res.status(500).json({ message: "Error checking email" });
    }

    if (emailResults.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const insertQuery =
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

    // Using prepared statement to prevent SQL injection attack
    db.query(
      insertQuery,
      [name, email, hashedPassword],
      (insertErr, result) => {
        if (insertErr) {
          console.error("Error registering user:", insertErr);
          return res.status(500).json({ message: "Error registering user" });
        } else {
          res.status(201).json({ message: "User registered successfully" });
        }
      }
    );
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    if (bcrypt.compareSync(password, user.password)) {
      const otp = generateOTP();
      await insertOTP(user.id, otp);
      await sendOTP(user, otp);
      res.status(200).json({ message: "OTP sent successfully" });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Login error" });
  }
});

const getUserByEmail = (email) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT id, email, name, password FROM users WHERE email = ?";
    db.query(query, [email], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results.length ? results[0] : null);
      }
    });
  });
};

const insertOTP = (userId, otp) => {
  return new Promise((resolve, reject) => {
    const expirationTime = new Date(Date.now() + 15 * 60 * 1000);
    const query = `
      INSERT INTO otps (user_id, otp, expiration_time)
      VALUES (?, ?, ?);
    `;
    db.query(query, [userId, otp, expirationTime], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

const sendOTP = async (userInfo, otp) => {
  try {
    let transporter = nodemailer.createTransport({
      service: "Zoho",
      auth: {
        user: process.env.service_email,
        pass: process.env.service_password,
      },
    });

    await transporter.sendMail({
      from: `Computer Security <${process.env.service_email}>`,
      to: userInfo.email,
      subject: "Action Required: Verify Recent Login",
      html: otp_html(otp, userInfo.name),
    });
  } catch (err) {
    console.log(err);
  }
};

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    const otpRecord = await getLatestOTP(user.id);
    if (!otpRecord) {
      res.status(401).json({ message: "No OTP found for the user" });
      return;
    }

    const currentTime = new Date();
    if (otpRecord.expiration_time < currentTime) {
      res.status(401).json({ message: "OTP has expired" });
      return;
    }

    if (otpRecord.otp === otp) {
      res.status(200).json({ message: "OTP verified successfully", user });
    } else {
      res.status(401).json({ message: "Invalid OTP" });
    }
  } catch (err) {
    console.error("Error during OTP verification:", err);
    res.status(500).json({ message: "OTP verification error" });
  }
});

const getLatestOTP = (userId) => {
  return new Promise((resolve, reject) => {
    const query =
      "SELECT otp, expiration_time FROM otps WHERE user_id = ? ORDER BY id DESC LIMIT 1";
    db.query(query, [userId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results.length ? results[0] : null);
      }
    });
  });
};

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
