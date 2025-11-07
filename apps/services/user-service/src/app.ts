import express from 'express'

import session from 'express-session'
import passport from "passport";
import { router,authRouter } from './routes/user.routes';

const app = express()

app.use(express.json()); // Middleware to parse JSON requests
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded requests


// used for github and google oauth
app.use(session({
    secret: process.env.JWT_SECRET!,
    resave: false,
    saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());
//ends here 

// api routes 
app.use("/api/v1/auth", router)

// middlewares and routes
app.use("/api/v1/auth", authRouter);

export default app