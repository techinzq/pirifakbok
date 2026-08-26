import express from "express";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "API is running",
    message: "fakbok api"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
