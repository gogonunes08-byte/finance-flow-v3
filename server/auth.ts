
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { getUserByOpenId, upsertUser } from "./db";
import { ENV } from "./_core/env";

export function setupAuth() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn("⚠️ Google Auth credentials missing. Login will not work.");
        return;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: "/api/auth/callback/google",
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const openId = profile.id;
                    const email = profile.emails?.[0]?.value;
                    const name = profile.displayName;

                    await upsertUser({
                        openId,
                        email,
                        name,
                        loginMethod: "google",
                        lastSignedIn: new Date(),
                        googleAccessToken: accessToken,
                    });

                    const user = await getUserByOpenId(openId);
                    return done(null, user);
                } catch (error) {
                    return done(error as Error, undefined);
                }
            }
        )
    );

    passport.serializeUser((user: any, done) => {
        done(null, user.openId);
    });

    passport.deserializeUser(async (openId: string, done) => {
        try {
            const user = await getUserByOpenId(openId);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });
}
