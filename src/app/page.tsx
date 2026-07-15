import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { ScrollStory } from "@/components/marketing/ScrollStory";
import { WhyNitor } from "@/components/marketing/WhyNitor";
import { KineticFooter } from "@/components/marketing/KineticFooter";

/**
 * Logged-out landing page, live at `/`. The authenticated app starts at
 * `/today` (see Sidebar / AppFrame) — this page is intentionally NOT
 * wrapped in AppFrame (no sidebar, no app chrome). See DESIGN.md and the
 * marketing components under `src/components/marketing/` for the visual
 * system this page draws from.
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <ScrollStory />
      <WhyNitor />
      <KineticFooter />
    </main>
  );
}
