import { create } from "zustand";
import { persist } from "zustand/middleware";
import { WARDROBE_ITEMS } from "@/domain/pet";

interface PetState {
  /** Cumulative food fed to the pet. Persisted across sessions. */
  food: number;
  /** Feed the pet `n` units (default 1) and trigger a reaction pulse. */
  feed: (n?: number) => void;
  /** Increments each time the pet should visibly react (e.g. nav chip bounce). */
  pulse: number;
  triggerPulse: () => void;
  /** Currently equipped wardrobe item id (cosmetic only — see domain/pet.ts WARDROBE_ITEMS). */
  equipped: string;
  setEquipped: (id: string) => void;
}

export const usePetStore = create<PetState>()(
  persist(
    (set, get) => ({
      food: 0,
      pulse: 0,
      equipped: "none",
      feed: (n = 1) => {
        set((state) => ({ food: state.food + n }));
        get().triggerPulse();
      },
      triggerPulse: () => set((state) => ({ pulse: state.pulse + 1 })),
      setEquipped: (id) => set({ equipped: id }),
    }),
    {
      name: "nitor-pet",
      partialize: (state) => ({ food: state.food, equipped: state.equipped }),
    }
  )
);

/**
 * Pure: wardrobe item ids unlocked at a given best-streak (days), sourced
 * from domain/pet.ts WARDROBE_ITEMS milestones (halo@7, embers@21,
 * aurora@50, crown@100). "none" is always included (its milestone is 0).
 */
export function unlockedAccessories(bestStreak: number): string[] {
  return WARDROBE_ITEMS.filter((item) => bestStreak >= item.milestone).map((item) => item.id);
}
