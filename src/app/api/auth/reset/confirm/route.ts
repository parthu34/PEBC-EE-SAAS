import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { createHash } from "crypto";

function hashToken(token: string){
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request){
  const { token, password } = await req.json();
  if(typeof token !== "string" || token.length < 32) return NextResponse.json({error:"Invalid token"},{status:400});
  const hasPolicy = typeof password === "string"
    && password.length>=8
    && password.length<=128
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /[0-9]/.test(password)
    && /[^A-Za-z0-9]/.test(password)
    && !/\s/.test(password);
  if(!hasPolicy) return NextResponse.json({error:"Password does not meet policy"},{status:400});

  const tokenHash = hashToken(token);
  const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if(!rec || rec.expiresAt < new Date()) return NextResponse.json({error:"Invalid or expired token"},{status:400});
  if(rec.usedAt) return NextResponse.json({ ok:true, already:true });

  await prisma.user.update({ where: { id: rec.userId }, data: { password: await hashPassword(password) } });
  await prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: rec.userId, usedAt: null } });

  return NextResponse.json({ ok:true });
}
