import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PetState {
  /** Cumulative food fed to the pet. Persisted across sessions. */
  food: number;
  /** Feed the pet `n` units (default 1) and trigger a reaction pulse. */
  feed: (n?: number) => void;
  /** Increments each time the pet should visibly react (e.g. nav chip bounce). */
  pulse: number;
  triggerPulse: () => void;
  /** Currently equipped wardrobe item id (cosmetic only — see domain/pet.ts WARDROBE_ITEMS). */
  accessory: string;
  setAccessory: (id: string) => void;
}

export const usePetStore = create<PetState>()(
  persist(
    (set, get) => ({
      food: 0,
      pulse: 0,
      accessory: "none",
      feed: (n = 1) => {
        set((state) => ({ food: state.food + n }));
        get().triggerPulse();
      },
      triggerPulse: () => set((state) => ({ pulse: state.pulse + 1 })),
      setAccessory: (id) => set({ accessory: id }),
    }),
    {
      name: "nitor-pet",
      partialize: (state) => ({ food: state.food, accessory: state.accessory }),
    }
  )
);
