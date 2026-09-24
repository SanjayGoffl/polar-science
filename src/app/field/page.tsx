import type { Metadata } from "next";
import { FieldApp } from "@/components/field/FieldApp";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Field app" };
export const dynamic = "force-dynamic";

export default async function FieldPage() {
  const stations = await db.station.findMany({ orderBy: [{ region: "asc" }, { name: "asc" }], select: { slug: true, name: true, region: true } });
  return <FieldApp stations={stations} />;
}
