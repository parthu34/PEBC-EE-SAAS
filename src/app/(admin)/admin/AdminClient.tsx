"use client";
import { useState } from "react";

export default function AdminClient(){
  const [log,setLog]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [stats,setStats]=useState<any>(null);
  const [email,setEmail]=useState("");
  const add=(s:string)=>setLog(v=>[...v,s]);
  async function onFile(e:any){
    const f = e.target.files?.[0]; if(!f) return;
    const text = await f.text();
    setBusy(true);
    const r = await fetch("/api/import",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ json: text }) });
    const j = await r.json(); setBusy(false);
    if(!r.ok){ add(`ERROR: ${j.error||"Import failed"}`); return; }
    add(`OK: Imported ${j.count} questions. Removed ${j.removed}.`);
    if(typeof j.invalid === "number") add(`INFO: Invalid/missing fields: ${j.invalid}.`);
    if(typeof j.duplicates === "number") add(`INFO: Duplicates updated: ${j.duplicates}.`);
    if(j.warnings?.length){ j.warnings.forEach((w:string)=>add(`WARN: ${w}`)); }
  }
  return (
    <main className="container">
      <div className="card max-w-2xl mx-auto">
        <h1 className="text-lg font-semibold mb-2">Admin - Question Import</h1>
        <button className="btn mb-3" onClick={async()=>{
          const r = await fetch("/api/admin/stats");
          const j = await r.json();
          if(r.ok) setStats(j);
          else add(`ERROR: ${j.error||"Failed to load stats"}`);
        }}>Refresh Stats</button>
        {stats && (
          <div className="card mb-3 text-sm">
            <div>Total questions: <b>{stats.total}</b></div>
            <div>Unique (topic+conceptKey): <b>{stats.uniqueCount}</b></div>
            <div>Duplicates: <b>{stats.duplicateCount}</b></div>
            <div>Unique concepts: <b>{stats.uniqueConceptCount}</b></div>
            <div>Max full exams without reuse (after mock): <b>{stats.maxFullAttempts}</b></div>
          </div>
        )}
        <div className="card mb-3">
          <div className="text-sm opacity-80 mb-2">Reset attempts to refresh full exam pool.</div>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="User email (blank = all users)"
              value={email}
              onChange={e=>setEmail(e.target.value)}
            />
            <button className="btn" onClick={async()=>{
              setBusy(true);
              const r = await fetch("/api/admin/reset",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ email: email.trim() || null })});
              const j = await r.json(); setBusy(false);
              setLog(v=>[...v, r.ok?`OK: Reset ${j.count} attempts.`:`ERROR: ${j.error}`]);
            }}>Clear Attempts</button>
          </div>
        </div>
        <div className="card mb-3">
          <div className="text-sm opacity-80 mb-2">Danger zone: remove all questions.</div>
          <button className="btn" onClick={async()=>{
            if(!confirm("This will delete ALL questions and related data (forms/attempts/answers). Continue?")) return;
            setBusy(true);
            const r = await fetch("/api/admin/clear-questions",{method:"POST"});
            const j = await r.json(); setBusy(false);
            setLog(v=>[...v, r.ok?`OK: Cleared ${j.count} questions.`:`ERROR: ${j.error}`]);
          }}>Clear All Questions</button>
        </div>
        <input type="file" accept=".json" onChange={onFile} className="block"/>
        <p className="text-sm opacity-80 mt-2">Upload reviewed JSON.</p>
        <hr className="my-3"/>
        <button className="btn" onClick={async()=>{
          setBusy(true);
          const r = await fetch("/api/forms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ action:"buildForms" })});
          const j = await r.json(); setBusy(false);
          setLog(v=>[...v, j.ok?`OK: Built forms: ${j.labels?.join(", ")}`:`ERROR: ${j.error}`]);
          if(j.warning) setLog(v=>[...v, `WARN: ${j.warning}`]);
        }}>Build Disjoint Forms (Mock 30 + Full 200)</button>
        <div className="mt-3 space-y-1 text-sm">
          {log.map((l,i)=>(<div key={i}>{l}</div>))}
          {busy && <div>Working...</div>}
        </div>
      </div>
    </main>
  );
}
