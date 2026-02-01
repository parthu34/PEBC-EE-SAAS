"use client";
import { useState } from "react";

export default function CouponBanner(){
  const code = "EXAMREADY";
  const [copied,setCopied]=useState(false);
  const copy = async()=>{
    try{
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(()=>setCopied(false), 1500);
    }catch{
      setCopied(false);
    }
  };
  return (
    <div className="card mb-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span>Promo: 25% off</span>
        <span className="badge">{code}</span>
        <button className="btn" onClick={copy}>{copied ? "Copied" : "Copy code"}</button>
      </div>
    </div>
  );
}
