import app from "./app";
import type { Request, Response } from "express";
import dotenv from "dotenv";
import connectDB from "./db/db";
dotenv.config();


const PORT = process.env.PORT || 8000;

app.get("/", (req: Request, res: Response) => {
  res.send("hello world");
});

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();

