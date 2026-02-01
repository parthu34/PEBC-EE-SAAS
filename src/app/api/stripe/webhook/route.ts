
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request){
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sk = process.env.STRIPE_SECRET_KEY;
  if(!secret || !sk) return NextResponse.json({error:"Webhook not configured"},{status:500});
  const stripe = new Stripe(sk, { apiVersion: "2024-06-20" });
  const sig = (req.headers as any).get("stripe-signature");
  const buf = await req.arrayBuffer();
  let event: Stripe.Event;
  try{
    event = stripe.webhooks.constructEvent(Buffer.from(buf), sig as string, secret);
  }catch(err: any){
    return NextResponse.json({error:`Webhook signature verification failed: ${err.message}`},{status:400});
  }
  if(event.type === "checkout.session.completed"){
    const s = event.data.object as Stripe.Checkout.Session;
    const purchase = await prisma.purchase.findFirst({ where: { sessionId: s.id } });
    if(purchase && purchase.status !== "PAID"){
      await prisma.purchase.update({ where: { id: purchase.id }, data: { status: "PAID", invoiceId: (s.invoice as string)||null } });
      const product = await prisma.product.findUnique({ where: { id: purchase.productId } });
      const qty = product?.slug==="full-200-3pack" ? 3 : 1;
      const existing = await prisma.examCredit.findFirst({ where: { userId: purchase.userId, productId: product!.id } });
      if(existing) await prisma.examCredit.update({ where: { id: existing.id }, data: { remaining: existing.remaining + qty } });
      else await prisma.examCredit.create({ data: { userId: purchase.userId, productId: product!.id, remaining: qty } });
    }
  }
  return NextResponse.json({ok:true});
}
