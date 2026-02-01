
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { createSession } from "@/lib/auth";

export async function POST(req: Request){
  const { email, password, name } = await req.json();
  if(!email || !password) return NextResponse.json({error:"Missing fields"},{status:400});
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(typeof email !== "string" || email.length>254 || !emailRe.test(email)) return NextResponse.json({error:"Invalid email"},{status:400});
  const hasPolicy = typeof password === "string"
    && password.length>=8
    && password.length<=128
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /[0-9]/.test(password)
    && /[^A-Za-z0-9]/.test(password)
    && !/\s/.test(password);
  if(!hasPolicy) return NextResponse.json({error:"Password does not meet policy"},{status:400});
  const exists = await prisma.user.findUnique({ where: { email } });
  if(exists) return NextResponse.json({error:"Email already in use"},{status:400});
  const user = await prisma.user.create({
    data: {
      email, name,
      password: await hashPassword(password),
      isAdmin: process.env.ADMIN_EMAIL?.toLowerCase()===email.toLowerCase()
    }
  });
  await createSession({ uid: user.id, email: user.email, isAdmin: user.isAdmin });
  return NextResponse.json({ ok: true });
}
