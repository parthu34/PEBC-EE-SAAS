import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminClient from "./AdminClient";

export default async function AdminPage(){
  const sess = await getSession();
  if(!sess || !sess.isAdmin) redirect("/dashboard");
  return <AdminClient />;
}
