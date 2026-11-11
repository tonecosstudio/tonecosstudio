/** Shared frame preserves one canonical visual layout for public/commercial modes. */
import type { PropsWithChildren } from "react";
import { ArcadeFrame } from "./ArcadeFrame";
import { ArcadeNav } from "@/components/arcade/ArcadeNav";
import { ArcadeFooter } from "@/components/arcade/ArcadeFooter";

export function MainLayout({ children }: PropsWithChildren) {
  return <ArcadeFrame nav={<ArcadeNav />} footer={<ArcadeFooter />}>{children}</ArcadeFrame>;
}
