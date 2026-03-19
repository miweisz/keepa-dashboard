import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const expected = process.env.APP_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  // Create a simple token from the password hash
  const encoder = new TextEncoder();
  const data = encoder.encode(password + expected);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const token = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const response = NextResponse.json({ ok: true });
  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/amazon-tracker",
  });

  return response;
}
