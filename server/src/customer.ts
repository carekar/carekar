import { createRemoteJWKSet, jwtVerify } from "jose";

// Verifies the customer's Firebase ID token (Google login on the website) using Google's
// public keys. No Firebase secret is needed on the server.

const projectId = () => process.env.FIREBASE_PROJECT_ID || "carekar-6ca30";
const keys = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export type Customer = { uid: string; email?: string; name?: string };

/** The logged-in customer, or null if the token is missing, expired or not for this project. */
export async function customerFromToken(token: string | undefined): Promise<Customer | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: `https://securetoken.google.com/${projectId()}`,
      audience: projectId(),
    });
    if (!payload.sub) return null;
    return {
      uid: payload.sub,
      email: typeof payload.email === "string" ? payload.email.slice(0, 120) : undefined,
      name: typeof payload.name === "string" ? payload.name.slice(0, 80) : undefined,
    };
  } catch (e) {
    console.warn("[customer] token rejected:", (e as Error).message);
    return null;
  }
}
