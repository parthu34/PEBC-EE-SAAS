import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request){
  const sess = await getSession();
  if(!sess || !sess.isAdmin) return NextResponse.json({error:"Unauthorized"},{status:401});
  const { email } = await req.json().catch(()=>({}));
  let userId: string | null = null;
  if(email){
    const user = await prisma.user.findUnique({ where: { email } });
    if(!user) return NextResponse.json({error:"User not found"},{status:404});
    userId = user.id;
  }
  const where = userId ? { userId } : {};
  const attempts = await prisma.attempt.findMany({ where, select: { id: true } });
  const attemptIds = attempts.map(a=>a.id);
  if(attemptIds.length){
    await prisma.attemptAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } });
    await prisma.attempt.deleteMany({ where: { id: { in: attemptIds } } });
  }
  const formWhere = userId
    ? {
        OR: [
          { label: { startsWith: "Mock-30 v1 | user:" } },
          { label: { startsWith: "Full-200 v1 | user:" } }
        ],
        AND: [{ label: { contains: `user:${userId}` } }]
      }
    : {
        OR: [
          { label: { startsWith: "Mock-30 v1 | user:" } },
          { label: { startsWith: "Full-200 v1 | user:" } }
        ]
      };
  const forms = await prisma.examForm.findMany({ where: formWhere, select: { id: true } });
  const formIds = forms.map(f=>f.id);
  if(formIds.length){
    await prisma.examFormItem.deleteMany({ where: { formId: { in: formIds } } });
    await prisma.examForm.deleteMany({ where: { id: { in: formIds } } });
  }
  return NextResponse.json({ ok:true, count: attemptIds.length });
}
