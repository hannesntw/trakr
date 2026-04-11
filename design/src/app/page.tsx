import { redirect } from "next/navigation";
import { defaultVariant } from "./variants";

export default function Home() {
  redirect(`/${defaultVariant}/board`);
}
