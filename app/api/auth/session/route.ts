import { NextResponse } from "next/server";
import { adminEmailAllowlist, isDevAuthBypassEnabled, sessionSecret } from "@/lib/env";
import { setSessionCookie } from "@/lib/auth/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    idToken?: string;
    demo?: boolean;
  };

  if (body.demo) {
    if (!isDevAuthBypassEnabled()) {
      return NextResponse.json(
        { error: "Mode demo hanya untuk development. Set Firebase Auth untuk produksi." },
        { status: 403 },
      );
    }
    if (!sessionSecret()) {
      return NextResponse.json({ error: "SESSION_SECRET belum diset" }, { status: 500 });
    }
    await setSessionCookie({ uid: "dev-admin", email: "demo@local", mode: "dev" });
    return NextResponse.json({ ok: true, mode: "dev" });
  }

  if (!body.idToken) {
    return NextResponse.json({ error: "idToken diperlukan" }, { status: 400 });
  }

  const verified = await verifyFirebaseIdToken(body.idToken);
  if (!verified?.email) {
    return NextResponse.json({ error: "Token Firebase tidak valid" }, { status: 401 });
  }

  const allow = adminEmailAllowlist();
  if (allow && verified.email !== allow) {
    return NextResponse.json({ error: "Email ini bukan admin" }, { status: 403 });
  }

  await setSessionCookie({ uid: verified.uid, email: verified.email, mode: "firebase" });
  return NextResponse.json({ ok: true, mode: "firebase" });
}
