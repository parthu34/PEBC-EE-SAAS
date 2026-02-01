
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev_dev_dev");

export type Session = { uid: string, email: string, isAdmin: boolean };

export async function createSession(s: Session){
  const token = await new SignJWT(s as any)
    .setProtectedHeader({alg:"HS256"})
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  cookies().set(COOKIE, token, { httpOnly:true, sameSite:"lax", secure: process.env.NODE_ENV==="production", path:"/" });
}

export async function deleteSession(){
  cookies().set(COOKIE, "", { httpOnly:true, sameSite:"lax", secure: process.env.NODE_ENV==="production", path:"/", maxAge:0 });
}

export async function getSession(): Promise<Session | null>{
  const token = cookies().get(COOKIE)?.value;
  if(!token) return null;
  try{
    const { payload } = await jwtVerify(token, secret);
    return payload as any;
  }catch{ return null; }
}
