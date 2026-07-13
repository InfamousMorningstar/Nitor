import { TabBar } from "@/components/nav/TabBar";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
        Settings
      </h1>
      <TabBar />
    </main>
  );
}
