import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  if (await getSession()) {
    redirect("/dashboard");
  }
  redirect("/login");
}
