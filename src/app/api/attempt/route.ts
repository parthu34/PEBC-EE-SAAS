
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const MOCK_LABEL_PREFIX = "Mock-30 v1 | user:";
const FULL_LABEL_PREFIX = "Full-200 v1 | user:";

async function getUniqueQuestions(){
  const qs = await prisma.question.findMany({
    where: { active: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
  });
  const byConcept = new Map<string, typeof qs[number]>();
  for(const q of qs){
    if(!byConcept.has(q.conceptKey)) byConcept.set(q.conceptKey, q);
  }
  return Array.from(byConcept.values());
}

const TOPIC_PHARM_SCI = "Pharmaceutical Sciences";
const TOPIC_PRACTICE = "Pharmacy Practice";
const TOPIC_BSA = "Behavioural, Social, and Administrative Sciences";

function normalizeTopic(t: string){
  const s = (t || "").trim().toLowerCase();
  if(s.startsWith("pharmaceutical sciences")) return TOPIC_PHARM_SCI;
  if(s.startsWith("pharmacy practice")) return TOPIC_PRACTICE;
  if(s.includes("behavioural") || s.includes("behavioral") || s.includes("administrative")){
    return TOPIC_BSA;
  }
  return t;
}

const FULL_COUNTS = { [TOPIC_PHARM_SCI]: 50, [TOPIC_PRACTICE]: 110, [TOPIC_BSA]: 40 };
const MOCK_COUNTS = { [TOPIC_PHARM_SCI]: 8, [TOPIC_PRACTICE]: 16, [TOPIC_BSA]: 6 };

function pickByTopic(uniqueQs: any[], counts: Record<string, number>){
  const byTopic = new Map<string, any[]>();
  for(const q of uniqueQs){
    const topic = normalizeTopic(q.topic);
    if(!byTopic.has(topic)) byTopic.set(topic, []);
    byTopic.get(topic)!.push(q);
  }
  const out: any[] = [];
  for(const [topic, needed] of Object.entries(counts)){
    const pool = byTopic.get(topic) || [];
    if(pool.length < needed) return null;
    out.push(...pool.slice(0, needed));
  }
  return out;
}

function chunkByTopic(uniqueQs: any[], counts: Record<string, number>, slots: number){
  const byTopic = new Map<string, any[]>();
  for(const q of uniqueQs){
    const topic = normalizeTopic(q.topic);
    if(!byTopic.has(topic)) byTopic.set(topic, []);
    byTopic.get(topic)!.push(q);
  }
  const forms: any[][] = Array.from({ length: slots }, ()=>[]);
  for(const [topic, perForm] of Object.entries(counts)){
    const pool = byTopic.get(topic) || [];
    if(pool.length < perForm * slots) return null;
    for(let i=0;i<slots;i++){
      const start = i * perForm;
      const chunk = pool.slice(start, start + perForm);
      forms[i].push(...chunk);
    }
  }
  return forms;
}

async function ensureUserMockForm(userId: string){
  const label = `${MOCK_LABEL_PREFIX}${userId}`;
  const existing = await prisma.examForm.findUnique({
    where: { label },
    include: { items: { include: { question: true }, orderBy: { position: "asc" } } }
  });
  if(existing) return existing;
  const uniqueQs = await getUniqueQuestions();
  const mockQs = pickByTopic(uniqueQs, MOCK_COUNTS);
  if(!mockQs) return null;
  const form = await prisma.examForm.create({ data: { label, size: mockQs.length, published: false } });
  for(let i=0;i<mockQs.length;i++){
    await prisma.examFormItem.create({ data: { formId: form.id, questionId: mockQs[i].id, position: i+1 } });
  }
  return await prisma.examForm.findUnique({
    where: { id: form.id },
    include: { items: { include: { question: true }, orderBy: { position: "asc" } } }
  });
}

async function ensureUserFullForms(userId: string, slots: number){
  const forms = [];
  for(let i=1;i<=slots;i++){
    const label = `${FULL_LABEL_PREFIX}${userId} | slot:${i}`;
    const existing = await prisma.examForm.findUnique({
      where: { label },
      include: { items: { include: { question: true }, orderBy: { position: "asc" } } }
    });
    if(existing){
      forms.push(existing);
      continue;
    }
    const uniqueQs = await getUniqueQuestions();
    const mockQs = pickByTopic(uniqueQs, MOCK_COUNTS);
    if(!mockQs) return null;
    const mockConcepts = new Set(mockQs.map(q=>q.conceptKey));
    const fullPool = uniqueQs.filter(q=>!mockConcepts.has(q.conceptKey));
    const chunks = chunkByTopic(fullPool, FULL_COUNTS, slots);
    if(!chunks) return null;
    const chunk = chunks[i-1];
    const form = await prisma.examForm.create({ data: { label, size: chunk.length, published: false } });
    for(let j=0;j<chunk.length;j++){
      await prisma.examFormItem.create({ data: { formId: form.id, questionId: chunk[j].id, position: j+1 } });
    }
    const created = await prisma.examForm.findUnique({
      where: { id: form.id },
      include: { items: { include: { question: true }, orderBy: { position: "asc" } } }
    });
    if(created) forms.push(created);
  }
  return forms;
}

export async function POST(req: Request){
  const sess = await getSession(); if(!sess) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body = await req.json();
  const { mode } = body || {};
  const requestedSlot = Number(body?.slot || 0);
  const previewPack = Number(body?.previewPack || 0);
  if(!["mock","full"].includes(mode)) return NextResponse.json({error:"Invalid mode"},{status:400});
  // defer existing-attempt lookup until after we know the specific form (slot)

  let form = null;

  if(mode==="mock"){
    form = await ensureUserMockForm(sess.uid);
    if(!form) return NextResponse.json({error:"Not enough unique questions to build Mock 30."},{status:400});
  }

  if(mode==="full"){
    if(!sess.isAdmin){
      const paidPurchases = await prisma.purchase.findMany({
        where: { userId: sess.uid, status: "PAID", product: { slug: { in: ["full-200","full-200-3pack"] } } },
        include: { product: true }
      });
      const totalSlots = paidPurchases.reduce((sum,p)=> sum + (p.product.slug==="full-200-3pack" ? 3 : 1), 0);
      if(totalSlots < 1) return NextResponse.json({error:"Purchase required."},{status:403});
    }

    let totalSlots = 0;
    if(sess.isAdmin && (previewPack === 1 || previewPack === 3)){
      totalSlots = previewPack;
    } else {
      const paidPurchases = await prisma.purchase.findMany({
        where: { userId: sess.uid, status: "PAID", product: { slug: { in: ["full-200","full-200-3pack"] } } },
        include: { product: true }
      });
      totalSlots = paidPurchases.reduce((sum,p)=> sum + (p.product.slug==="full-200-3pack" ? 3 : 1), 0);
    }
    if(!sess.isAdmin && totalSlots < 1) return NextResponse.json({error:"Purchase required."},{status:403});
    const slots = Math.max(1, totalSlots || 0);
    if(requestedSlot && (requestedSlot < 1 || requestedSlot > slots)){
      return NextResponse.json({error:"Invalid exam slot for your purchase."},{status:400});
    }
    const fullForms = await ensureUserFullForms(sess.uid, slots);
    if(!fullForms) return NextResponse.json({error:"Not enough unique questions to build Full 200."},{status:400});

    const attempts = await prisma.attempt.findMany({
      where: { userId: sess.uid, mode: "FULL" },
      include: { form: true }
    });
    const usedFormIds = new Set(attempts.map(a=>a.formId));
    if(requestedSlot){
      form = fullForms[requestedSlot-1];
    } else {
      form = fullForms.find(f=>!usedFormIds.has(f.id)) || fullForms[0];
    }
  }

  if(!form) return NextResponse.json({error:"Form not found. Admin must build forms."},{status:400});

  const existing = await prisma.attempt.findFirst({
    where: { userId: sess.uid, mode: mode==="mock" ? "MOCK" : "FULL", submittedAt: null, formId: form.id },
    orderBy: { startedAt: "desc" },
    include: { form: { include: { items: { include: { question: true }, orderBy: { position: "asc" } } } }, answers: true }
  });
  if(existing){
    const elapsedMs = Date.now() - new Date(existing.startedAt).getTime();
    if(elapsedMs >= existing.timeLimitS * 1000){
      let score = 0;
      for(const it of existing.form.items){
        const ans = existing.answers.find(a=>a.questionId===it.questionId);
        if(ans?.correct) score++;
      }
      await prisma.attempt.update({ where: { id: existing.id }, data: { score, submittedAt: new Date() } });
    } else {
      return NextResponse.json({
        ok:true,
        attemptId: existing.id,
        questions: existing.form.items.map(i=>({
          id: i.question.id, topic: i.question.topic, stem: i.question.stem, options: i.question.options, answer: i.question.answer, rationale: i.question.rationale
        })),
        answers: existing.answers.map(a=>({ questionId: a.questionId, selected: a.selected, flagged: a.flagged })),
        startedAt: existing.startedAt,
        timeLimitS: existing.timeLimitS
      });
    }
  }
  const limit = mode==="mock" ? 45*60 : 4*60*60;
  const attempt = await prisma.attempt.create({ data: { userId: sess.uid, formId: form.id, mode: mode==="mock"?"MOCK":"FULL", timeLimitS: limit } });

  return NextResponse.json({ ok:true, attemptId: attempt.id, questions: form.items.map(i=>({
    id: i.question.id, topic: i.question.topic, stem: i.question.stem, options: i.question.options, answer: i.question.answer, rationale: i.question.rationale
  })), answers: [], startedAt: attempt.startedAt, timeLimitS: attempt.timeLimitS });
}
