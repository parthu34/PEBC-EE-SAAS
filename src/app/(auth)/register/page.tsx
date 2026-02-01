
"use client";
import { useState } from "react";

export default function Register(){
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState(""); const [err,setErr]=useState("");
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const pwRules = [
    { test: (p:string)=>p.length>=8 && p.length<=128, label: "8-128 characters" },
    { test: (p:string)=>/[a-z]/.test(p), label: "lowercase letter" },
    { test: (p:string)=>/[A-Z]/.test(p), label: "uppercase letter" },
    { test: (p:string)=>/[0-9]/.test(p), label: "number" },
    { test: (p:string)=>/[^A-Za-z0-9]/.test(p), label: "symbol" },
    { test: (p:string)=>!/\s/.test(p), label: "no spaces" }
  ];
  const submit=async(e:any)=>{
    e.preventDefault(); setErr("");
    if(email.length>254 || !emailRe.test(email)){ setErr("Enter a valid email."); return; }
    if(!pwRules.every(r=>r.test(password))){
      setErr("Password must meet the policy below.");
      return;
    }
    const r = await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,name})});
    if(r.ok) location.href="/dashboard"; else setErr((await r.json()).error||"Registration failed");
  };
  return (
    <main className="container">
      <div className="card max-w-md mx-auto">
        <h1 className="text-lg font-semibold mb-2">Create account</h1>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Name</label><input className="input" value={name} onChange={e=>setName(e.target.value)} /></div>
          <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>
            <div className="text-xs opacity-80 mt-2">
              Password policy: {pwRules.map(r=>r.label).join(", ")}.
            </div>
          </div>
          {err && <p className="text-red-300 text-sm">{err}</p>}
          <button className="btn btn-primary w-full" type="submit">Create</button>
        </form>
        <p className="text-sm opacity-80 mt-2">Already have an account? <a className="link" href="/login">Sign in</a></p>
      </div>
    </main>
  );
}
