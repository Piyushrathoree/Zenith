import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError";

const connectDB = async () => {
  try {
    const db = await mongoose.connect(process.env.MONGO_URI!);
    if (!db) {
      throw new ApiError(500, "something went wrong while connecting to the database")
    }
    console.log(
      "------- mongodb connected successfully ------- :"
    );
  } 
  catch (error) {
    console.error(error);
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("----- MongoDB disconnected -----");
  });

};
export default connectDB