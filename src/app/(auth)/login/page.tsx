
"use client";
import { useState } from "react";

export default function Login(){
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [err,setErr]=useState("");
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const submit=async(e:any)=>{
    e.preventDefault(); setErr("");
    if(email.length>254 || !emailRe.test(email)){ setErr("Enter a valid email."); return; }
    if(password.length < 8 || password.length > 128){ setErr("Password must be 8-128 characters."); return; }
    if(/\s/.test(password)){ setErr("Password cannot contain spaces."); return; }
    const r = await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
    if(r.ok) location.href="/dashboard"; else setErr((await r.json()).error||"Login failed");
  };
  return (
    <main className="container">
      <div className="card max-w-md mx-auto">
        <h1 className="text-lg font-semibold mb-2">Sign in</h1>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
          <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>
          {err && <p className="text-red-300 text-sm">{err}</p>}
          <button className="btn btn-primary w-full" type="submit">Sign in</button>
        </form>
        <p className="text-sm opacity-80 mt-2">No account? <a className="link" href="/register">Create one</a></p>
        <p className="text-sm opacity-80 mt-2"><a className="link" href="/forgot">Forgot password?</a></p>
      </div>
    </main>
  );
}
