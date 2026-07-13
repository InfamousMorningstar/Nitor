/**
 * Curated emoji dataset for habit creation. Deterministic, self-contained
 * (no external lib) — each entry pairs an emoji with searchable keywords.
 *
 * `searchEmojis(query)` powers the EmojiPicker: as a user types a habit
 * name, matching emojis surface first (startsWith matches rank above
 * substring matches; ties keep dataset order).
 */

export interface EmojiEntry {
  emoji: string;
  keywords: string[];
}

export const EMOJI_DATA: EmojiEntry[] = [
  // Reading & learning
  { emoji: "📖", keywords: ["read", "reading", "book", "novel", "study"] },
  { emoji: "📚", keywords: ["study", "books", "school", "learn", "homework", "read"] },
  { emoji: "✍️", keywords: ["write", "writing", "journal", "diary", "notes"] },
  { emoji: "📝", keywords: ["write", "notes", "todo", "list", "plan"] },
  { emoji: "🎓", keywords: ["learn", "study", "school", "graduate", "course"] },
  { emoji: "🧠", keywords: ["brain", "think", "memory", "learn", "mind", "puzzle"] },
  { emoji: "🔤", keywords: ["language", "learn", "vocab", "spelling", "alphabet"] },
  { emoji: "🗣️", keywords: ["speak", "language", "talk", "practice", "speech"] },

  // Fitness & movement
  { emoji: "🏃", keywords: ["run", "running", "jog", "cardio", "exercise"] },
  { emoji: "🏋️", keywords: ["workout", "gym", "lift", "weights", "strength", "exercise"] },
  { emoji: "🚶", keywords: ["walk", "walking", "steps", "stroll"] },
  { emoji: "🧘", keywords: ["meditate", "meditation", "yoga", "mindfulness", "calm"] },
  { emoji: "🤸", keywords: ["stretch", "stretching", "flexibility", "gymnastics", "mobility"] },
  { emoji: "🚴", keywords: ["bike", "cycle", "cycling", "ride"] },
  { emoji: "🏊", keywords: ["swim", "swimming", "pool", "laps"] },
  { emoji: "⚽", keywords: ["soccer", "football", "sport", "practice"] },
  { emoji: "🏀", keywords: ["basketball", "sport", "hoops", "practice"] },
  { emoji: "🎾", keywords: ["tennis", "sport", "racket", "practice"] },
  { emoji: "🥊", keywords: ["box", "boxing", "fight", "training", "martial"] },
  { emoji: "🤾", keywords: ["sport", "handball", "training"] },
  { emoji: "🧗", keywords: ["climb", "climbing", "boulder"] },
  { emoji: "🛼", keywords: ["skate", "skating", "rollerblade"] },
  { emoji: "⛷️", keywords: ["ski", "skiing", "winter", "sport"] },
  { emoji: "🤽", keywords: ["water", "polo", "swim", "sport"] },
  { emoji: "🪢", keywords: ["rope", "jump", "skip", "training"] },
  { emoji: "🦵", keywords: ["leg", "day", "squat", "workout"] },
  { emoji: "💪", keywords: ["strength", "muscle", "workout", "gym", "flex", "strong"] },

  // Health & body
  { emoji: "💧", keywords: ["water", "drink", "hydrate", "hydration"] },
  { emoji: "😴", keywords: ["sleep", "bed", "rest", "nap", "bedtime"] },
  { emoji: "💊", keywords: ["vitamins", "medicine", "pills", "supplement", "meds"] },
  { emoji: "🥗", keywords: ["salad", "healthy", "eat", "diet", "vegetables", "nutrition"] },
  { emoji: "🍎", keywords: ["apple", "fruit", "healthy", "eat", "snack"] },
  { emoji: "🥦", keywords: ["broccoli", "vegetables", "healthy", "diet"] },
  { emoji: "🦷", keywords: ["teeth", "brush", "floss", "dental", "hygiene"] },
  { emoji: "🧴", keywords: ["skincare", "lotion", "moisturize", "routine"] },
  { emoji: "🚿", keywords: ["shower", "wash", "hygiene", "bathe"] },
  { emoji: "🛁", keywords: ["bath", "soak", "hygiene", "relax"] },
  { emoji: "⚖️", keywords: ["weight", "scale", "measure", "diet"] },
  { emoji: "❤️", keywords: ["heart", "health", "cardio", "love", "wellbeing"] },
  { emoji: "🩺", keywords: ["health", "doctor", "checkup", "medical"] },
  { emoji: "🌞", keywords: ["sun", "morning", "sunlight", "wake", "vitamin d"] },
  { emoji: "🧊", keywords: ["cold", "ice", "shower", "plunge", "recovery"] },

  // Mindfulness & spirit
  { emoji: "🙏", keywords: ["pray", "prayer", "gratitude", "thanks", "faith"] },
  { emoji: "🕯️", keywords: ["candle", "calm", "reflect", "quiet"] },
  { emoji: "🌿", keywords: ["nature", "plant", "calm", "green", "grow"] },
  { emoji: "☯️", keywords: ["balance", "zen", "mindfulness", "calm"] },
  { emoji: "🧘‍♀️", keywords: ["meditate", "yoga", "mindfulness", "calm"] },
  { emoji: "🫁", keywords: ["breathe", "breathing", "lungs", "calm"] },
  { emoji: "📿", keywords: ["pray", "prayer", "meditation", "beads", "faith"] },

  // Quit / avoid habits
  { emoji: "🚭", keywords: ["no smoking", "quit smoking", "cigarette", "smoke"] },
  { emoji: "🚫", keywords: ["no", "stop", "quit", "avoid", "ban"] },
  { emoji: "🍬", keywords: ["sugar", "candy", "sweets", "no sugar"] },
  { emoji: "🍺", keywords: ["alcohol", "beer", "drink", "no alcohol", "quit drinking"] },
  { emoji: "🍷", keywords: ["wine", "alcohol", "drink", "no alcohol"] },
  { emoji: "📵", keywords: ["no phone", "screen", "digital detox", "offline", "quit phone"] },
  { emoji: "🎰", keywords: ["gambling", "bet", "quit gambling", "casino"] },
  { emoji: "🍔", keywords: ["junk food", "fast food", "no junk", "burger"] },
  { emoji: "☕", keywords: ["coffee", "caffeine", "no caffeine", "quit coffee"] },
  { emoji: "🛑", keywords: ["stop", "quit", "halt", "avoid"] },

  // Productivity & work
  { emoji: "💻", keywords: ["code", "coding", "programming", "work", "computer"] },
  { emoji: "🎯", keywords: ["goal", "target", "focus", "aim"] },
  { emoji: "⏰", keywords: ["alarm", "wake", "morning", "time", "routine"] },
  { emoji: "📅", keywords: ["calendar", "plan", "schedule", "date"] },
  { emoji: "✅", keywords: ["done", "check", "complete", "todo", "task"] },
  { emoji: "📊", keywords: ["chart", "data", "stats", "report", "analysis"] },
  { emoji: "💼", keywords: ["work", "job", "career", "office", "business"] },
  { emoji: "🗂️", keywords: ["organize", "files", "declutter", "tidy"] },
  { emoji: "⏱️", keywords: ["timer", "time", "focus", "pomodoro"] },
  { emoji: "🔋", keywords: ["energy", "recharge", "battery", "rest"] },

  // Money & finance
  { emoji: "💰", keywords: ["money", "save", "savings", "finance", "budget"] },
  { emoji: "💵", keywords: ["money", "cash", "save", "budget", "finance"] },
  { emoji: "🏦", keywords: ["bank", "savings", "finance", "money"] },
  { emoji: "📈", keywords: ["invest", "investing", "growth", "stocks", "finance"] },
  { emoji: "🪙", keywords: ["coin", "money", "save", "budget"] },

  // Hobbies & creativity
  { emoji: "🎸", keywords: ["guitar", "music", "practice", "instrument"] },
  { emoji: "🎹", keywords: ["piano", "music", "practice", "instrument", "keys"] },
  { emoji: "🥁", keywords: ["drums", "music", "practice", "instrument"] },
  { emoji: "🎨", keywords: ["art", "paint", "draw", "creative", "sketch"] },
  { emoji: "📷", keywords: ["photo", "photography", "camera", "picture"] },
  { emoji: "🧶", keywords: ["knit", "knitting", "craft", "yarn"] },
  { emoji: "🌱", keywords: ["plant", "garden", "grow", "nature", "water plants"] },
  { emoji: "🍳", keywords: ["cook", "cooking", "meal", "kitchen", "recipe"] },
  { emoji: "🎬", keywords: ["film", "video", "movie", "edit", "create"] },
  { emoji: "🧩", keywords: ["puzzle", "game", "brain", "solve"] },
  { emoji: "♟️", keywords: ["chess", "strategy", "game", "practice"] },
  { emoji: "🎮", keywords: ["game", "gaming", "play", "video game"] },
  { emoji: "🪡", keywords: ["sew", "sewing", "craft", "stitch"] },
  { emoji: "📐", keywords: ["design", "draft", "plan", "architecture"] },

  // Social & relationships
  { emoji: "☎️", keywords: ["call", "phone", "check in", "family", "friend"] },
  { emoji: "💌", keywords: ["message", "letter", "connect", "friend", "family"] },
  { emoji: "🤝", keywords: ["connect", "meet", "social", "network"] },
  { emoji: "👨‍👩‍👧", keywords: ["family", "time", "connect", "kids"] },
  { emoji: "🐶", keywords: ["dog", "pet", "walk dog", "animal"] },
  { emoji: "🐱", keywords: ["cat", "pet", "animal", "feed"] },

  // Home & chores
  { emoji: "🧹", keywords: ["clean", "cleaning", "sweep", "tidy", "chores"] },
  { emoji: "🧺", keywords: ["laundry", "clothes", "wash", "chores"] },
  { emoji: "🛏️", keywords: ["bed", "make bed", "tidy", "room", "morning"] },
  { emoji: "🗑️", keywords: ["trash", "declutter", "clean", "chores"] },
  { emoji: "🪴", keywords: ["plant", "water plants", "garden", "care"] },
  { emoji: "🧽", keywords: ["clean", "scrub", "dishes", "chores"] },

  // Misc / general
  { emoji: "🌙", keywords: ["night", "evening", "sleep", "routine"] },
  { emoji: "🔥", keywords: ["streak", "fire", "momentum", "consistency"] },
  { emoji: "⭐", keywords: ["star", "goal", "favorite", "achievement"] },
  { emoji: "🌈", keywords: ["mood", "positivity", "gratitude", "happy"] },
  { emoji: "🧭", keywords: ["direction", "focus", "goal", "navigate"] },
  { emoji: "🪑", keywords: ["posture", "sit", "desk", "work"] },
  { emoji: "👀", keywords: ["screen", "eyes", "break", "rest eyes"] },
  { emoji: "🌻", keywords: ["outside", "sun", "nature", "walk"] },
  { emoji: "🚗", keywords: ["drive", "commute", "car", "travel"] },
  { emoji: "✈️", keywords: ["travel", "trip", "plan", "flight"] },
];

/**
 * Default emoji set shown when the query is empty/blank — the most
 * broadly useful habit emojis, in a sensible curated order.
 */
const DEFAULT_EMOJIS = [
  "📖", "🏃", "🏋️", "💧", "🧘", "😴", "✍️", "🚶", "📚", "💻",
  "🙏", "🤸", "💊", "🚫", "🚭", "💰", "🎸", "🧹", "☎️", "🥗",
];

/**
 * Search the emoji dataset by keyword. Case-insensitive; entries whose
 * keyword *starts with* the query rank above entries where the query only
 * appears as a substring. Empty/blank query returns the default set.
 */
export function searchEmojis(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return DEFAULT_EMOJIS;

  const startsWith: string[] = [];
  const includes: string[] = [];
  const seen = new Set<string>();

  for (const { emoji, keywords } of EMOJI_DATA) {
    if (seen.has(emoji)) continue;
    let rank: 0 | 1 | 2 = 0; // 0 = no match
    for (const kw of keywords) {
      if (kw === q || kw.startsWith(q)) {
        rank = 2;
        break;
      }
      if (kw.includes(q)) {
        rank = Math.max(rank, 1) as 0 | 1 | 2;
      }
    }
    if (rank === 2) {
      startsWith.push(emoji);
      seen.add(emoji);
    } else if (rank === 1) {
      includes.push(emoji);
      seen.add(emoji);
    }
  }

  return [...startsWith, ...includes];
}
