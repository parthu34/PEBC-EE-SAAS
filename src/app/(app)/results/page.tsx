
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import ExportPdfButton from "./export-button";

export default async function ResultsPage({ searchParams }:{ searchParams: { attempt?: string } }){
  const sess = await getSession(); if(!sess) redirect("/login");
  if(searchParams.attempt){
    const a = await prisma.attempt.findUnique({
      where: { id: searchParams.attempt },
      include: { form: { include: { items: { include: { question: true }, orderBy: { position: "asc" } } } }, answers: true }
    });
    if(!a || a.userId!==sess.uid) return <main className="container"><div className="card">Attempt not found.</div></main>;
    const rows = a.form.items.map((it,idx)=>{
      const ans = a.answers.find(x=>x.questionId===it.questionId);
      const your = typeof ans?.selected==="number" ? (it.question.options as any[])[ans.selected!] : "-";
      const corr = (it.question.options as any[])[it.question.answer as number];
      const ok = ans?.correct;
      return { n: idx+1, topic: it.question.topic, stem: it.question.stem, your, corr, ok, rationale: it.question.rationale };
    });
    const byTopic = new Map<string,{c:number,t:number}>();
    rows.forEach(r=>{
      const cur = byTopic.get(r.topic) || {c:0,t:0}; cur.t++; if(r.ok) cur.c++; byTopic.set(r.topic, cur);
    });
    return (
      <main className="container">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold">Result Summary</h1>
            <div className="flex gap-2">
              <Link className="btn" href="/dashboard">Back to Dashboard</Link>
              <ExportPdfButton />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="card"><b>Form</b><div>{a.form.label}</div></div>
            <div className="card"><b>Started</b><div>{new Date(a.startedAt).toLocaleString()}</div></div>
            <div className="card"><b>Score</b><div>{a.score ?? "-"}</div></div>
          </div>
          <h3 className="mt-4 mb-1 font-semibold">By Topic</h3>
          <table className="table">
            <thead><tr><th>Topic</th><th>Correct</th><th>Total</th><th>%</th></tr></thead>
            <tbody>{[...byTopic.entries()].map(([k,v])=>(<tr key={k}><td>{k}</td><td>{v.c}</td><td>{v.t}</td><td>{Math.round(100*v.c/v.t)}%</td></tr>))}</tbody>
          </table>
          <h3 className="mt-4 mb-1 font-semibold">Question Review</h3>
          <table className="table">
            <thead><tr><th>#</th><th>Topic</th><th>Question</th><th>Your Answer</th><th>Correct</th><th>Rationale</th></tr></thead>
            <tbody>
              {rows.map(r=>(<tr key={r.n}><td>{r.n}</td><td>{r.topic}</td><td>{r.stem}</td><td>{r.your}</td><td>{r.corr}</td><td>{r.rationale}</td></tr>))}
            </tbody>
          </table>
          <div className="mt-3"><Link className="btn" href="/dashboard">Back to Dashboard</Link></div>
        </div>
      </main>
    );
  }

  const attempts = await prisma.attempt.findMany({ where: { userId: sess.uid }, include: { form: true }, orderBy: { startedAt: "desc" } });
  return (
    <main className="container">
      <div className="card">
        <h1 className="text-lg font-semibold mb-2">Results</h1>
        <table className="table">
          <thead><tr><th>Form</th><th>Started</th><th>Score</th><th></th></tr></thead>
          <tbody>
            {attempts.map(a=>(
              <tr key={a.id}><td>{a.form.label}</td><td>{new Date(a.startedAt).toLocaleString()}</td><td>{a.score ?? "-"}</td><td><Link className="link" href={`/results?attempt=${a.id}`}>Open</Link></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
