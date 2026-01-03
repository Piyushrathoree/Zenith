import { Router } from "express";
import passport from "passport";
import { googleCallback , githubCallback } from "../controllers/Oauth.controller";
import { deleteUser, LoginUser, RegisterUser, updateUser } from "../controllers/user.controller";

const router = Router()
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    googleCallback
);

// GitHub auth
router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));
router.get("/github/callback",
    passport.authenticate("github", { failureRedirect: "/" }),
    githubCallback
);

const authRouter = Router()
authRouter.post('/register',RegisterUser)
authRouter.post("/login",LoginUser)
authRouter.put("/update/:userId",updateUser)
authRouter.delete("/delete/:userId",deleteUser)

export { router ,authRouter };