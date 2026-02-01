
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request){
  const sess = await getSession();
  if(!sess || !sess.isAdmin) return NextResponse.json({error:"Unauthorized"},{status:401});
  const { action } = await req.json();
  if(action!=="buildForms") return NextResponse.json({error:"Unknown action"},{status:400});
  const qs = await prisma.question.findMany({ where: { active: true } });
  const byConcept = new Map<string, any>();
  for(const q of qs){
    if(!byConcept.has(q.conceptKey)) byConcept.set(q.conceptKey, q);
  }
  const uniqueQs = Array.from(byConcept.values());
  const TOPIC_PHARM_SCI = "Pharmaceutical Sciences";
  const TOPIC_PRACTICE = "Pharmacy Practice";
  const TOPIC_BSA = "Behavioural, Social, and Administrative Sciences";
  const FULL_COUNTS = { [TOPIC_PHARM_SCI]: 50, [TOPIC_PRACTICE]: 110, [TOPIC_BSA]: 40 };
  const MOCK_COUNTS = { [TOPIC_PHARM_SCI]: 8, [TOPIC_PRACTICE]: 16, [TOPIC_BSA]: 6 };
  const normalizeTopic = (t: string) => {
    const s = (t || "").trim().toLowerCase();
    if(s.startsWith("pharmaceutical sciences")) return "Pharmaceutical Sciences";
    if(s.startsWith("pharmacy practice")) return "Pharmacy Practice";
    if(s.includes("behavioural") || s.includes("behavioral") || s.includes("administrative")){
      return "Behavioural, Social, and Administrative Sciences";
    }
    return t;
  };
  const byTopic = new Map<string, any[]>();
  for(const q of uniqueQs){
    const topic = normalizeTopic(q.topic);
    if(!byTopic.has(topic)) byTopic.set(topic, []);
    byTopic.get(topic)!.push(q);
  }
  const topicCounts = Object.fromEntries([...byTopic.entries()].map(([k,v])=>[k, v.length]));
  function pickByTopic(counts: Record<string, number>){
    const out:any[]=[];
    for(const [topic, needed] of Object.entries(counts)){
      const pool = byTopic.get(topic) || [];
      if(pool.length < needed) return null;
      out.push(...pool.slice(0, needed));
    }
    return out;
  }
  const mock = await prisma.examForm.upsert({ where: { label: "Mock-30 v1" }, update: {}, create: { label:"Mock-30 v1", size:30 } });
  const full = await prisma.examForm.upsert({ where: { label: "Full-200 v1" }, update: {}, create: { label:"Full-200 v1", size:200 } });
  await prisma.examFormItem.deleteMany({ where: { formId: { in: [mock.id, full.id] } } });
  const m = pickByTopic(MOCK_COUNTS);
  if(!m) return NextResponse.json({error:`Not enough questions to build Mock 30 with blueprint. Available: ${JSON.stringify(topicCounts)}`},{status:400});
  const mockConcepts = new Set(m.map(q=>q.conceptKey));
  const fullPool = uniqueQs.filter(q=>!mockConcepts.has(q.conceptKey));
  const byTopicFull = new Map<string, any[]>();
  for(const q of fullPool){
    if(!byTopicFull.has(q.topic)) byTopicFull.set(q.topic, []);
    byTopicFull.get(q.topic)!.push(q);
  }
  const f:any[]=[];
  for(const [topic, needed] of Object.entries(FULL_COUNTS)){
    const pool = byTopicFull.get(topic) || [];
    if(pool.length < needed){
      const avail = Object.fromEntries([...byTopicFull.entries()].map(([k,v])=>[k, v.length]));
      return NextResponse.json({error:`Not enough ${topic} questions for Full 200. Available: ${JSON.stringify(avail)}`},{status:400});
    }
    f.push(...pool.slice(0, needed));
  }
  for(let i=0;i<m.length;i++){ await prisma.examFormItem.create({ data: { formId: mock.id, questionId: m[i].id, position: i+1 } }); }
  for(let i=0;i<f.length;i++){ await prisma.examFormItem.create({ data: { formId: full.id, questionId: f[i].id, position: i+1 } }); }
  await prisma.examForm.update({ where: { id: mock.id }, data: { size: m.length } });
  await prisma.examForm.update({ where: { id: full.id }, data: { size: f.length } });
  return NextResponse.json({ ok:true, labels:["Mock-30 v1","Full-200 v1"] });
}
