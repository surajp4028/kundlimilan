import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterFlow } from "@/components/auth/register-flow";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <AuthShell quote="Verified once. Your reports, safe forever.">
      <RegisterFlow />
    </AuthShell>
  );
}
