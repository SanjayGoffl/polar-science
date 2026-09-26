import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryView } from "@/components/story/StoryView";
import { db } from "@/lib/db";
import { loadStory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await db.expedition.findUnique({ where: { slug: (await params).slug }, select: { name: true, summary: true } });
  return e ? { title: `${e.name}: the story`, description: e.summary } : { title: "Story" };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const story = await loadStory((await params).slug);
  if (!story) notFound();
  return <StoryView story={story} />;
}
