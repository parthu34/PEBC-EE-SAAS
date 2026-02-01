"use client";
import { useEffect, useState } from "react";

export default function FinalizePurchase({ sessionId, canceled }: { sessionId?: string; canceled?: string }){
  const [msg,setMsg]=useState<string>("");
  useEffect(()=>{
    if(canceled) { setMsg("Checkout canceled. No credits were added."); return; }
    if(!sessionId) return;
    (async()=>{
      const r = await fetch("/api/stripe/finalize",{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({ session_id: sessionId })});
      const j = await r.json();
      if(r.ok && (j.ok || j.already)) setMsg("Purchase confirmed. Credits updated.");
      else setMsg(j.error || "Could not confirm purchase yet.");
    })();
  },[sessionId, canceled]);
  if(!msg) return null;
  return (
    <div className="card mb-3 text-sm">{msg}</div>
  );
}
