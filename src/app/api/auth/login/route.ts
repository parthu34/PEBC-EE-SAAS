
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { createSession } from "@/lib/auth";

export async function POST(req: Request){
  const { email, password } = await req.json();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(typeof email !== "string" || email.length>254 || !emailRe.test(email)) return NextResponse.json({error:"Invalid credentials"},{status:400});
  if(typeof password !== "string" || password.length<8 || password.length>128 || /\s/.test(password)) return NextResponse.json({error:"Invalid credentials"},{status:400});
  const user = await prisma.user.findUnique({ where: { email } });
  if(!user) return NextResponse.json({error:"Invalid credentials"},{status:400});
  const ok = await verifyPassword(password, user.password);
  if(!ok) return NextResponse.json({error:"Invalid credentials"},{status:400});
  await createSession({ uid: user.id, email: user.email, isAdmin: user.isAdmin });
  return NextResponse.json({ ok: true });
}
