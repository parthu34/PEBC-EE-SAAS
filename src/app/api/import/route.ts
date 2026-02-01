
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { conceptKey, anchorKey } from "@/lib/keys";

export async function POST(req: Request){
  const sess = await getSession();
  if(!sess || !sess.isAdmin) return NextResponse.json({error:"Unauthorized"},{status:401});
  const { json } = await req.json();
  let items: any[];
  try{ items = JSON.parse(json); }catch{ return NextResponse.json({error:"Invalid JSON"}, {status:400}); }
  if(!Array.isArray(items)) return NextResponse.json({error:"Expected array"}, {status:400});
  let count=0, removed=0; const warn = new Set<string>();
  const seen = new Set<string>();
  for(const q of items){
    if(!q?.stem || !q?.options || typeof q?.answer!=="number" || !q?.topic){ removed++; continue; }
    if(!Array.isArray(q.options) || q.options.length < 2){ removed++; warn.add(`Invalid options for topic: ${q.topic}`); continue; }
    const ck = conceptKey(q.stem); const ak = anchorKey(q.stem);
    const key = `${q.topic}::${ck}`;
    if(seen.has(key)){ removed++; warn.add(`Duplicate in upload (topic,conceptKey): ${key}`); continue; }
    seen.add(key);
    try{
      const existing = await prisma.question.findUnique({ where: { topic_conceptKey: { topic: q.topic, conceptKey: ck } } });
      await prisma.question.upsert({
        where: { topic_conceptKey: { topic: q.topic, conceptKey: ck } },
        update: { stem:q.stem, options:q.options, answer:q.answer, rationale:q.rationale||"", difficulty:q.difficulty||null, anchorKey: ak, active:true },
        create: { topic:q.topic, stem:q.stem, options:q.options, answer:q.answer, rationale:q.rationale||"", difficulty:q.difficulty||null, conceptKey:ck, anchorKey: ak }
      });
      if(existing) warn.add(`Duplicate in DB updated (topic,conceptKey): ${key}`);
      count++;
    }catch(e:any){
      warn.add(`Skipped duplicate by unique(topic,conceptKey): ${q.topic} :: ${ck}`);
    }
  }
  return NextResponse.json({ ok:true, count, removed, warnings:[...warn] });
}
