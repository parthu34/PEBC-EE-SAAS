"use client";
import { useState } from "react";

export default function ForgotPassword(){
  const [email,setEmail]=useState("");
  const [msg,setMsg]=useState("");
  const [token,setToken]=useState("");
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const submit=async(e:any)=>{
    e.preventDefault(); setMsg(""); setToken("");
    if(email.length>254 || !emailRe.test(email)){ setMsg("Enter a valid email."); return; }
    const r = await fetch("/api/auth/reset/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
    const j = await r.json();
    setMsg("If the account exists, a reset link has been sent.");
    if(j?.token) setToken(j.token);
  };

  return (
    <main className="container">
      <div className="card max-w-md mx-auto">
        <h1 className="text-lg font-semibold mb-2">Reset password</h1>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
          {msg && <p className="text-sm opacity-80">{msg}</p>}
          {token && (
            <p className="text-xs opacity-80">Dev token: {token}</p>
          )}
          <button className="btn btn-primary w-full" type="submit">Send reset link</button>
        </form>
      </div>
    </main>
  );
}
