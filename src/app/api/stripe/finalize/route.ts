
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request){
  const sess = await getSession();
  if(!sess) return NextResponse.json({error:"Unauthorized"},{status:401});
  const { session_id } = await req.json();
  if(!session_id) return NextResponse.json({error:"Missing session_id"},{status:400});
  const secret = process.env.STRIPE_SECRET_KEY;
  if(!secret) return NextResponse.json({error:"Missing STRIPE_SECRET_KEY"},{status:500});
  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });
  const s = await stripe.checkout.sessions.retrieve(session_id);
  if(s.payment_status !== "paid") return NextResponse.json({ok:false, status:s.payment_status},{status:202});

  const purchase = await prisma.purchase.findFirst({ where: { sessionId: session_id } });
  if(!purchase) return NextResponse.json({error:"Purchase not found"},{status:404});
  if(purchase.userId !== sess.uid) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(purchase.status === "PAID") return NextResponse.json({ok:true, already:true});

  await prisma.purchase.update({ where: { id: purchase.id }, data: { status: "PAID", invoiceId: (s.invoice as string)||null } });

  const product = await prisma.product.findUnique({ where: { id: purchase.productId } });
  const qty = product?.slug==="full-200-3pack" ? 3 : 1;
  const existing = await prisma.examCredit.findFirst({ where: { userId: purchase.userId, productId: product!.id } });
  if(existing) await prisma.examCredit.update({ where: { id: existing.id }, data: { remaining: existing.remaining + qty } });
  else await prisma.examCredit.create({ data: { userId: purchase.userId, productId: product!.id, remaining: qty } });

  return NextResponse.json({ ok: true, credited: qty });
}
