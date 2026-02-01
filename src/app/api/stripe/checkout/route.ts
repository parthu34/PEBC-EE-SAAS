
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request){
  const contentType = req.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const form = !isJson ? await req.formData().catch(()=>null) : null;
  const json = isJson ? await req.json().catch(()=>({})) : form ? Object.fromEntries(form.entries()) : {};
  const priceType = json?.priceType;
  const priceId = priceType==="bundle3"
    ? process.env.STRIPE_PRICE_BUNDLE_3
    : priceType==="full"
      ? process.env.STRIPE_PRICE_FULL
      : json?.priceId || process.env.STRIPE_PRICE_FULL;
  const allowed = new Set([process.env.STRIPE_PRICE_FULL, process.env.STRIPE_PRICE_BUNDLE_3].filter(Boolean) as string[]);
  if(!priceId || !allowed.has(priceId)) return NextResponse.json({error:"Invalid priceId"},{status:400});
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const sess = await getSession();
  if(!sess) return NextResponse.json({error:"Unauthorized"},{status:401});

  const secret = process.env.STRIPE_SECRET_KEY;
  if(!secret) return NextResponse.json({error:"Missing STRIPE_SECRET_KEY"},{status:500});
  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });

  const automaticTaxEnabled = process.env.STRIPE_AUTOMATIC_TAX === "true";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId as string, quantity: 1 }],
    success_url: `${site}/dashboard?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/dashboard?canceled=1`,
    automatic_tax: { enabled: automaticTaxEnabled },
    allow_promotion_codes: true,
    metadata: { userId: sess.uid }
  });

  const product = priceId===process.env.STRIPE_PRICE_BUNDLE_3
    ? await prisma.product.upsert({ where:{ slug:"full-200-3pack" }, update:{}, create:{ slug:"full-200-3pack", name:"Full Exam - 3 Pack", type:"FULL", priceCents:1599 } })
    : await prisma.product.upsert({ where:{ slug:"full-200" }, update:{}, create:{ slug:"full-200", name:"Full Exam (200Q)", type:"FULL", priceCents:999 } });

  await prisma.purchase.create({ data: { userId: sess.uid, productId: product.id, status:"PENDING", sessionId: session.id } });

  if(form){
    return NextResponse.redirect(session.url as string);
  }
  return NextResponse.json({ id: session.id, url: session.url });
}
