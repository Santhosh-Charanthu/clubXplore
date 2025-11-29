const express = require("express");
const router = express.Router();
const generateOTP = require("../utils/otp");
const transporter = require("../config/email");

const otpStore = {}; // temporary in-memory store

// Send OTP
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = generateOTP();

  otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 }; // 5 mins

  try {
    await transporter.sendMail({
      from: `ClubXplore <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
    });

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// Verify OTP
router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const stored = otpStore[email];
  console.log(req.body);

  if (!stored) {
    return res
      .status(400)
      .json({ success: false, message: "No OTP found for this email" });
  }

  if (Date.now() > stored.expires) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: "OTP expired" });
  }

  if (stored.otp.toString() !== otp.toString()) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  delete otpStore[email]; // clear after successful verification
  res.json({ success: true, message: "OTP verified successfully" });
});

module.exports = router;
