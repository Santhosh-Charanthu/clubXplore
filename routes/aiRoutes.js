// const express = require("express");
// const { generateEventDescription } = require("../services/aiService.js");

// const router = express.Router();

// router.post("/generate-event", async (req, res) => {
//   try {
//     const result = await generateEventDescription(req.body);
//     res.json({ text: result });
//   } catch (err) {
//     console.error("OPENAI ERROR 👉", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// module.exports = router;
