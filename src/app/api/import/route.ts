
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
  let count=0, removed=0, invalid=0, duplicates=0; const warn = new Set<string>();
  const seen = new Set<string>();
  for(const q of items){
    if(!q?.stem || !q?.options || !q?.topic){ removed++; invalid++; continue; }
    if(!Array.isArray(q.options) || q.options.length < 2){ removed++; invalid++; warn.add(`Invalid options for topic: ${q.topic}`); continue; }
    const ck = (q.concept_key && typeof q.concept_key === "string") ? q.concept_key : conceptKey(q.stem);
    const ak = (q.anchor_key && typeof q.anchor_key === "string") ? q.anchor_key : anchorKey(q.stem);
    const key = `${q.topic}::${ck}`;
    if(seen.has(key)){ removed++; warn.add(`Duplicate in upload (topic,conceptKey): ${key}`); continue; }
    seen.add(key);
    const hasAnswer = typeof q.answer === "number";
    try{
      const existing = await prisma.question.findUnique({ where: { topic_conceptKey: { topic: q.topic, conceptKey: ck } } });
      await prisma.question.upsert({
        where: { topic_conceptKey: { topic: q.topic, conceptKey: ck } },
        update: { stem:q.stem, options:q.options, answer: hasAnswer ? q.answer : 0, rationale:q.rationale||"", difficulty:q.difficulty||null, anchorKey: ak, active: hasAnswer },
        create: { topic:q.topic, stem:q.stem, options:q.options, answer: hasAnswer ? q.answer : 0, rationale:q.rationale||"", difficulty:q.difficulty||null, conceptKey:ck, anchorKey: ak, active: hasAnswer }
      });
      if(existing){ duplicates++; warn.add(`Duplicate in DB updated (topic,conceptKey): ${key}`); }
      if(!hasAnswer){ invalid++; warn.add(`Missing answer, set inactive: ${key}`); }
      count++;
    }catch(e:any){
      warn.add(`Skipped duplicate by unique(topic,conceptKey): ${q.topic} :: ${ck}`);
    }
  }
  return NextResponse.json({ ok:true, count, removed, invalid, duplicates, warnings:[...warn] });
}
