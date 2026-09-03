export const dynamic = "force-dynamic";

import { LoginForm } from "@/components/LoginForm";
import { isDevAuthBypassEnabled, isFirebaseClientConfigured, isProduction } from "@/lib/env";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <LoginForm
        firebaseConfigured={isFirebaseClientConfigured()}
        devBypass={isDevAuthBypassEnabled()}
        production={isProduction()}
      />
    </main>
  );
}
