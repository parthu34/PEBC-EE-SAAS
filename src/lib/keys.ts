
export function conceptKey(stem: string){
  let s = stem.toLowerCase();
  s = s.replace(/\(case[^)]*\)/g, " ");
  s = s.replace(/\b\d+\s*(year|yr)s?-?old\b/g, " ");
  s = s.replace(/\b\d+(\.\d+)?\b/g, " ");
  const syn: [RegExp,string][] = [
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
export function anchorKey(stem: string){
  const ck = conceptKey(stem);
  const fam: [RegExp,string][] = [
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
