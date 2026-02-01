"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetClient(){
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password,setPassword]=useState("");
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const pwRules = [
    { test: (p:string)=>p.length>=8 && p.length<=128, label: "8-128 characters" },
    { test: (p:string)=>/[a-z]/.test(p), label: "lowercase letter" },
    { test: (p:string)=>/[A-Z]/.test(p), label: "uppercase letter" },
    { test: (p:string)=>/[0-9]/.test(p), label: "number" },
    { test: (p:string)=>/[^A-Za-z0-9]/.test(p), label: "symbol" },
    { test: (p:string)=>!/\s/.test(p), label: "no spaces" }
  ];

  const submit=async(e:any)=>{
    e.preventDefault(); setMsg("");
    if(busy) return;
    if(!token){ setMsg("Missing token."); return; }
    if(!pwRules.every(r=>r.test(password))){ setMsg("Password must meet the policy below."); return; }
    setBusy(true);
    const r = await fetch("/api/auth/reset/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,password})});
    const j = await r.json();
    if(r.ok) setMsg("Password updated. You can now sign in.");
    else setMsg(j.error || "Reset failed");
    setBusy(false);
  };

  return (
    <main className="container">
      <div className="card max-w-md mx-auto">
        <h1 className="text-lg font-semibold mb-2">Set a new password</h1>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">New password</label>
            <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>
            <div className="text-xs opacity-80 mt-2">
              Password policy: {pwRules.map(r=>r.label).join(", ")}.
            </div>
          </div>
          {msg && (
            <div className="text-sm opacity-80 space-y-2">
              <p>{msg}</p>
              {msg.startsWith("Password updated") && (
                <a className="link" href="/login">Go to sign in</a>
              )}
            </div>
          )}
          <button className="btn btn-primary w-full" type="submit" disabled={busy}>{busy ? "Updating..." : "Update password"}</button>
        </form>
      </div>
    </main>
  );
}
