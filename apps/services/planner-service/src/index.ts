import app from "./app";
import connectDB from "./db/db";
import dotenv from 'dotenv'

dotenv.config()
const PORT = process.env.PORT!


const startServer = () => {

    connectDB()

    app.listen(PORT, () => {
        console.log(`planner service is running at port ${PORT}`)
    })

}

startServer()