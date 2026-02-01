import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash, randomBytes } from "crypto";
import { Resend } from "resend";

function hashToken(token: string){
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request){
  const { email } = await req.json();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(typeof email !== "string" || email.length>254 || !emailRe.test(email)){
    return NextResponse.json({ ok:true });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if(!user) return NextResponse.json({ ok:true });

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const resetLink = `${site}/reset?token=${token}`;

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "no-reply@example.com";
  if(resendKey){
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from,
      to: email,
      subject: "Reset your password",
      html: `<p>Click to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
      text: `Reset your password: ${resetLink}`
    }).catch(()=>{});
    return NextResponse.json({ ok:true });
  }

  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({ ok:true, ...(isDev ? { token } : {}) });
}
