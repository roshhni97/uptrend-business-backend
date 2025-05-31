require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const port = 5000;

// Set up Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
app.use(cors());
app.use(express.json());

// Middleware to check for token
const authenticateJWT = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(403).send("Access denied");
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).send("Invalid token");
    }
    req.user = user;
    next();
  });
};

// Signup Route
app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;

  // Check if the user already exists
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  res
    .status(201)
    .json({ message: "User created successfully!", user: data.user });
});
app.post("/api/creditsafe", async (req, res) => {
  try {
    const { companyName, zipcode } = req.body;

    // Validate input on server side instead of using alert
    if (!companyName || !zipcode) {
      return res
        .status(400)
        .json({ error: "Please provide business name and zip code" });
    }

    const data = await fetch("https://connect.creditsafe.com/v1/authenticate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        Username: "wespaul1804@gmail.com",
        Password: "J48GA339S2651EIIy4G29*"
      })
    });

    const tokendata = await data.json();
    const token = tokendata.token;
    console.log(token);

    const companiesData = await fetch(
      ` https://connect.creditsafe.com/v1/companies?page=1&pageSize=2&countries=US&name=${companyName}&postCode=${zipcode}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        }
      }
    );

    const companies = await companiesData.json();
    res.json(companies);
  } catch (error) {
    // Type assertion for error handling
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error("An unknown error occurred");
    }
    res.status(500).json({ error: "Failed to fetch from Creditsafe" });
  }
});
// Login Route
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  // Create JWT token
  const token = jwt.sign({ userId: data.user.id }, process.env.JWT_SECRET, {
    expiresIn: "1h"
  });

  res.status(200).json({ message: "Logged in successfully", token });
});

// Protected Route
app.get("/protected", authenticateJWT, (req, res) => {
  res.status(200).json({
    message: "You have access to this protected route",
    user: req.user
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
