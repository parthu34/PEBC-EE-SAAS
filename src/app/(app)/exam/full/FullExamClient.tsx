"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Q = { id:string; topic:string; stem:string; options:string[]; answer:number; rationale:string };
type Answer = { questionId: string; selected: number | null; flagged: boolean | null };
type AttemptResponse = { attemptId: string; questions: Q[]; answers: Answer[]; startedAt: string; timeLimitS: number };

export default function FullExamClient(){
  const searchParams = useSearchParams();
  const slot = Number(searchParams.get("slot") || "0");
  const previewPack = Number(searchParams.get("previewPack") || "0");
  const [qs,setQs]=useState<Q[]>([]); const [i,setI]=useState(0);
  const [answers,setAnswers]=useState<Record<string,number|undefined>>({});
  const [flags,setFlags]=useState<Record<string,boolean>>({});
  const [left,setLeft]=useState(4*60*60); const [attemptId,setAttemptId]=useState<string>("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string>("");
  const [paused,setPaused]=useState(false);
  const timer = useRef<any>(null);
  const started = useRef(false);
  const limit = 4*60*60;

  useEffect(()=>{(async()=>{
    if(started.current) return;
    started.current = true;
    const r = await fetch("/api/attempt",{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'full', slot, previewPack})});
    const j: AttemptResponse = await r.json();
    if(!r.ok) { setError((j as any).error||"Cannot start exam"); setLoading(false); return; }
    if(!j.questions || j.questions.length===0){
      setError("No questions available for this exam yet.");
      setLoading(false);
      return;
    }
    setAttemptId(j.attemptId);
    setQs(j.questions);
    const a: Record<string, number|undefined> = {};
    const f: Record<string, boolean> = {};
    j.answers?.forEach(ans=>{
      if(typeof ans.selected==="number") a[ans.questionId]=ans.selected;
      if(ans.flagged) f[ans.questionId]=true;
    });
    setAnswers(a); setFlags(f);
    const startedAt = new Date(j.startedAt).getTime();
    const remaining = Math.max(0, Math.round(j.timeLimitS - (Date.now()-startedAt)/1000));
    setLeft(remaining);
    const savedIndex = Number(localStorage.getItem("full:lastIndex")||"0");
    if(!Number.isNaN(savedIndex)) setI(Math.min(savedIndex, j.questions.length-1));
    setLoading(false);
  })()},[slot, previewPack]);

  const submit = useCallback(async()=>{
    if(!attemptId) return;
    await fetch("/api/answer",{method:"PUT",headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId,submit:true})});
    localStorage.removeItem("full:attemptId");
    location.href="/results?attempt="+attemptId;
  },[attemptId]);

  useEffect(()=>{
    if(paused) return;
    timer.current=setInterval(()=>setLeft(l=>Math.max(0,l-1)),1000);
    return ()=>clearInterval(timer.current);
  },[paused]);
  useEffect(()=>{ if(left<=0) submit(); },[left, submit]);
  useEffect(()=>{ if(attemptId) localStorage.setItem("full:attemptId", attemptId); },[attemptId]);
  useEffect(()=>{ localStorage.setItem("full:lastIndex", String(i)); },[i]);

  async function save(q:Q, choice:number|undefined){
    if(!attemptId) return;
    setAnswers(a=>({...a,[q.id]:choice}));
    await fetch("/api/answer",{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId,questionId:q.id,selected:choice,timeSpent:5})});
  }
  async function mark(q:Q){
    if(!attemptId) return;
    setFlags(f=>({...f,[q.id]:!f[q.id]}));
    await fetch("/api/answer",{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId,questionId:q.id,flagged:!flags[q.id]})});
  }
  const q = qs[i];
  const pct = qs.length? Math.round(100*Object.values(answers).filter(v=>v!==undefined).length/qs.length):0;
  const posPct = qs.length>1 ? Math.round(100 * i / (qs.length-1)) : 0;
  const lowTime = left <= Math.max(300, Math.floor(limit * 0.1));

  return (
    <main className="container">
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <div className="flex gap-2 items-center"><span className="badge">Full Exam (200Q)</span><span className="badge">{i+1}/{qs.length||200}</span><span className="badge">{q?.topic||""}</span></div>
          <div className={`badge ${lowTime ? "text-red-300" : ""}`} style={{fontSize:"16px", padding:"6px 10px"}}>
            {String(Math.floor(left/60)).padStart(2,'0')}:{String(left%60).padStart(2,'0')}
          </div>
        </div>
        {error ? (
          <div>
            <p className="text-sm text-red-300 mb-2">{error}</p>
            <p className="text-sm opacity-80">If you just set up the app, run the seed to create questions and forms.</p>
            <p className="text-sm opacity-80 mt-2"><a className="link" href="/dashboard">Back to dashboard</a></p>
          </div>
        ) : q ? (
          <>
            {qs.length < 200 && (
              <div className="card mb-3 text-sm">
                Only {qs.length} questions available for this full exam. Import more questions to reach 200.
              </div>
            )}
            <div className="mb-2 text-sm opacity-80">Position: {i+1} of {qs.length}</div>
            <div className="mb-3 w-full h-2 rounded bg-slate-800 overflow-hidden">
              <div className="h-full" style={{width: posPct+"%", background:"linear-gradient(90deg,#4f8cff,#7dd3fc)"}}/>
            </div>
            <div className="mb-3 flex flex-wrap gap-2 max-h-40 overflow-auto">
              {qs.map((_,idx)=>(
                <button
                  key={idx}
                  className={`btn ${idx===i ? "btn-primary" : ""}`}
                  style={flags[qs[idx].id] ? { background:"#dc2626", color:"#fff", borderColor:"#f87171" } : undefined}
                  onClick={()=>setI(idx)}
                  aria-label={`Go to question ${idx+1}`}
                >
                  {idx+1}
                </button>
              ))}
            </div>
            <p className="mb-3">{q.stem}</p>
            <div className="space-y-2">
              {q.options.map((o,idx)=>(
                <label key={idx} className={"block p-2 rounded border "+(answers[q.id]===idx?"border-blue-400":"border-slate-600")}>
                  <input type="radio" name={"q"+q.id} className="mr-2" checked={answers[q.id]===idx} onChange={()=>save(q,idx)} />
                  {o}
                </label>
              ))}
            </div>
            <div className="mt-3 flex justify-between">
              <div className="flex gap-2">
                <button className="btn" onClick={()=>setI(i=>Math.max(0,i-1))}>Prev</button>
                <button className="btn" onClick={()=>setI(i=>Math.min((qs.length||200)-1,i+1))}>Next</button>
                <button className="btn" onClick={()=>mark(q)}>{flags[q.id]?"Unflag":"Flag"}</button>
              </div>
              <div className="flex gap-2 items-center">
                <div className="w-40 h-2 rounded bg-slate-800 overflow-hidden"><div className="h-full" style={{width:pct+"%", background:"linear-gradient(90deg,#4f8cff,#7dd3fc)"}}/></div>
                <button className="btn" onClick={()=>setPaused(p=>!p)}>{paused ? "Resume" : "Pause"}</button>
                <button className="btn btn-primary" onClick={submit}>Submit</button>
              </div>
            </div>
          </>
        ): <p>{loading ? "Loading..." : "No questions available."}</p>}
      </div>
    </main>
  );
}
