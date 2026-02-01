"use client";
import { useState } from "react";

export default function BuyButton({ priceType, label, primary }: { priceType: "full" | "bundle3"; label: string; primary?: boolean }){
  const [busy,setBusy]=useState(false);
  const onClick = async()=>{
    if(busy) return;
    setBusy(true);
    const r = await fetch("/api/stripe/checkout",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ priceType })
    });
    const j = await r.json().catch(()=>null);
    if(j?.url) window.location.href = j.url;
    else alert(j?.error || "Could not start checkout");
    setBusy(false);
  };
  return (
    <button className={`btn ${primary ? "btn-primary" : ""} w-full`} onClick={onClick} disabled={busy}>
      {busy ? "Redirecting..." : label}
    </button>
  );
}
