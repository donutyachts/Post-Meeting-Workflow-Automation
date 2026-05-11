"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks() {
  const pathname = usePathname();
  const isRunActive = pathname === "/runs" || pathname.startsWith("/workflow");
  const isProjectsActive = pathname === "/projects";

  return (
    <>
      <Link href="/runs" className={`app-nav-link${isRunActive ? " active" : ""}`}>
        Run History
      </Link>
      <Link href="/projects" className={`app-nav-link${isProjectsActive ? " active" : ""}`}>
        Projects
      </Link>
    </>
  );
}
