import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const db = await mongoose.connect(process.env.MONGO_URI!);
    console.log(
      "------- mongodb connected successfully ------- :"
    );
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

    mongoose.connection.on("disconnected", () => {
        console.warn("----- MongoDB disconnected -----");
    });

};
export default connectDB