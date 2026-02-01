import { NextResponse } from "next/server";

export async function GET(){
  return NextResponse.json({
    full: process.env.STRIPE_PRICE_FULL || "",
    bundle3: process.env.STRIPE_PRICE_BUNDLE_3 || ""
  });
}
