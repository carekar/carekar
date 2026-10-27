import { createRemoteJWKSet, jwtVerify } from "jose";

// Verifies Firebase ID tokens (Google login on the website) using Google's public keys.
// Used for customers (bookings) and for the team's dashboard login. No Firebase secret needed.

const projectId = () => process.env.FIREBASE_PROJECT_ID || "carekar-6ca30";
const keys = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export type Customer = { uid: string; email?: string; name?: string };
export type GoogleUser = Customer & { emailVerified: boolean };

/** The Google account behind a Firebase ID token, or null if missing, expired or not for this project. */
export async function googleUserFromToken(token: string | undefined): Promise<GoogleUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: `https://securetoken.google.com/${projectId()}`,
      audience: projectId(),
    });
    if (!payload.sub) return null;
    return {
      uid: payload.sub,
      email: typeof payload.email === "string" ? payload.email.slice(0, 120).toLowerCase() : undefined,
      name: typeof payload.name === "string" ? payload.name.slice(0, 80) : undefined,
      emailVerified: payload.email_verified === true,
    };
  } catch (e) {
    console.warn("[google] token rejected:", (e as Error).message);
    return null;
  }
}

/** The logged-in customer (for bookings), or null. */
export async function customerFromToken(token: string | undefined): Promise<Customer | null> {
  const u = await googleUserFromToken(token);
  return u ? { uid: u.uid, email: u.email, name: u.name } : null;
}
