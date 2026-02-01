
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function conceptKey(stem){
  let s = stem.toLowerCase();
  s = s.replace(/\(case[^)]*\)/g, " ");
  s = s.replace(/\b\d+\s*(year|yr)s?-?old\b/g, " ");
  s = s.replace(/\b\d+(\.\d+)?\b/g, " ");
  const syn = [
    [/\batrial\s*fib(ri?llation)?\b/g, "atrial fibrillation"],
    [/\baf\b/g, "atrial fibrillation"],
    [/\btype\s*2\s*diabetes\b|\bt2d\b/g, "t2d"],
    [/\bckd\b/g, "chronic kidney disease"],
    [/\buti\b/g, "urinary tract infection"],
    [/\bcap\b/g, "community acquired pneumonia"],
    [/\bhelicobacter pylori\b|\bh\.?\s*pylori\b/g, "h pylori"],
    [/\bdoac\b/g, "doac"],
    [/\bhfref\b|\bheart failure\b/g, "heart failure"],
    [/\bmi\b|\bmyocardial infarction\b/g, "mi"],
    [/\bcha[ds]*2?-?vasc\b/g, "chascore"],
  ];
  syn.forEach(([p,r])=> s = s.replace(p,r));
  s = s.replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  return s;
}
function anchorKey(stem){
  const ck = conceptKey(stem);
  const fam = [
    [/atrial fibrillation.*(stroke|anticoag|doac|warfarin)/, "af_stroke_prevention"],
    [/dissolution|apparatus|sink/, "dissolution_testing"],
    [/vaccin(e|ation).*documentation|lot|expiry/, "vaccine_documentation"],
    [/h pylori/, "h_pylori_tx"],
    [/steady\s*state|css|infusion\s*rate|maintenance\s*rate/, "pk_ss_css"],
    [/baroreceptor.*hypotension/, "baroreceptor_hypotension"],
  ];
  for(const [pat,name] of fam){ if(pat.test(ck)) return name; }
  const toks = ck.split(" ").filter(t=>t.length>3);
  return Array.from(new Set(toks.slice(0,4))).sort().join("_") || ck;
}

async function main(){
  await prisma.product.upsert({ where:{ slug:"full-200" }, update:{}, create:{ slug:"full-200", name:"Full Exam (200Q)", type:"FULL", priceCents:999 } });
  await prisma.product.upsert({ where:{ slug:"full-200-3pack" }, update:{}, create:{ slug:"full-200-3pack", name:"Full Exam - 3 Pack", type:"FULL", priceCents:1599 } });

  const dir = path.join(process.cwd(), "seed-data");
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f=>f.toLowerCase().endsWith(".json"))
    : [];
  let count=0;
  for(const f of files){
    const arr = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
    for(const q of arr){
      const ck = conceptKey(q.stem); const ak = anchorKey(q.stem);
      await prisma.question.upsert({
        where: { topic_conceptKey: { topic: q.topic, conceptKey: ck } },
        update: { stem:q.stem, options:q.options, answer:q.answer, rationale:q.rationale||"", difficulty:q.difficulty||null, anchorKey: ak, active:true },
        create: { topic:q.topic, stem:q.stem, options:q.options, answer:q.answer, rationale:q.rationale||"", difficulty:q.difficulty||null, conceptKey:ck, anchorKey: ak }
      });
      count++;
    }
  }
  console.log("Inserted/updated questions:", count);

  const qs = await prisma.question.findMany({ where:{ active:true } });
  const used = new Set();
  function pickUnique(n, pool){
    const out=[];
    for(const q of pool){
      if(out.length>=n) break;
      if(used.has(q.conceptKey)) continue;
      used.add(q.conceptKey);
      out.push(q);
    }
    return out;
  }
  const mockForm = await prisma.examForm.upsert({ where:{ label:"Mock-30 v1" }, update:{}, create:{ label:"Mock-30 v1", size:30 } });
  const fullForm = await prisma.examForm.upsert({ where:{ label:"Full-200 v1" }, update:{}, create:{ label:"Full-200 v1", size:200 } });
  await prisma.examFormItem.deleteMany({ where: { formId: { in: [mockForm.id, fullForm.id] } } });
  const m = pickUnique(30, qs);
  const mockConcepts = new Set(m.map(q=>q.conceptKey));
  const fullPool = qs.filter(q=>!mockConcepts.has(q.conceptKey));
  const f = pickUnique(200, fullPool);
  const fallbackFull = f.length < 200 ? fullPool.filter(q=>!f.find(x=>x.id===q.id)) : [];
  for(const q of fallbackFull){
    if(f.length>=200) break;
    f.push(q);
  }
  if(m.length<1 || f.length<1) throw new Error("No questions available to build forms. Import more.");
  for(let i=0;i<m.length;i++){ await prisma.examFormItem.create({ data:{ formId: mockForm.id, questionId: m[i].id, position: i+1 } }); }
  for(let i=0;i<f.length;i++){ await prisma.examFormItem.create({ data:{ formId: fullForm.id, questionId: f[i].id, position: i+1 } }); }
  await prisma.examForm.update({ where:{ id: mockForm.id }, data:{ size: m.length } });
  await prisma.examForm.update({ where:{ id: fullForm.id }, data:{ size: f.length } });
  if(m.length<30 || f.length<200){
    console.warn(`Built forms with available questions. Mock: ${m.length}, Full: ${f.length}. Import more to reach 30/200.`);
  } else {
    console.log("Forms built: Mock-30 v1, Full-200 v1");
  }
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());
