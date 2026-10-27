"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { GoogleButton, InAppBrowserNote } from "@/components/site/GoogleLogin";
import { adminLogin } from "@/app/admin/actions";

/** Google sign-in for the dashboard. Access is decided by the API (super admin + Team page). */
export function AdminGoogleLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const login = async () => {
    setBusy(true);
    setError("");
    try {
      const fb = await import("@/lib/firebase");
      const user = await fb.signInWithGoogle();
      if (!user) return; // redirect flow: the page reloads
      const idToken = await fb.customerToken();
      const result = await adminLogin(idToken || "");
      // the dashboard has its own session; don't leave the team member logged in as a customer
      await fb.signOutCustomer();
      if (result.error) setError(result.error);
      else router.replace("/admin");
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError(code === "auth/unauthorized-domain" ? "Google login isn't enabled for this website address yet (Firebase → Authorized domains)." : "Couldn't log in with Google. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <InAppBrowserNote location="admin_login" />
      <GoogleButton onClick={login} busy={busy} />
      {error && (
        <p className="flex gap-2 text-sm font-medium text-danger" role="alert">
          <Icon name="alert" className="size-5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
