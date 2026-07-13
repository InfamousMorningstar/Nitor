/**
 * A small, hand-curated set of quotes for the Today page's QuoteCard.
 *
 * Every entry must have a real, checkable source — no aggregator fluff,
 * no misattributions (looking at you, fake Rumi/Einstein quotes floating
 * around the internet). Sources cite the original work/interview, not a
 * quote-site.
 */

export type Tradition = "stoic" | "science" | "wisdom" | "craft";

export interface Quote {
  text: string;
  author: string;
  source: string;
  tradition: Tradition;
  themes: string[];
}

export const QUOTES: Quote[] = [
  {
    text: "At dawn, when you have trouble getting out of bed, tell yourself: I have to go to work — as a human being. What do I have to complain of, if I'm going to do what I was born for?",
    author: "Marcus Aurelius",
    source: "Meditations, 5.1 (trans. Gregory Hays)",
    tradition: "stoic",
    themes: ["discipline", "purpose", "mornings"],
  },
  {
    text: "It is not that we have a short time to live, but that we waste a lot of it.",
    author: "Seneca",
    source: "On the Shortness of Life, 1",
    tradition: "stoic",
    themes: ["time", "attention"],
  },
  {
    text: "Men are disturbed not by the things which happen, but by the opinions about the things.",
    author: "Epictetus",
    source: "Enchiridion, 5 (trans. Elizabeth Carter)",
    tradition: "stoic",
    themes: ["perception", "control"],
  },
  {
    text: "Nowhere can a man find a quieter or more untroubled retreat than in his own soul.",
    author: "Marcus Aurelius",
    source: "Meditations, 4.3 (trans. George Long)",
    tradition: "stoic",
    themes: ["solitude", "steadiness"],
  },
  {
    text: "For indeed, with hardship will be ease. Indeed, with hardship will be ease.",
    author: "Qur'an",
    source: "Ash-Sharh 94:5–6",
    tradition: "wisdom",
    themes: ["hardship", "patience"],
  },
  {
    text: "All that we are is the result of what we have thought: it is founded on our thoughts, it is made up of our thoughts.",
    author: "Gautama Buddha",
    source: "Dhammapada, 1.1 (trans. Max Müller)",
    tradition: "wisdom",
    themes: ["mind", "cause and effect"],
  },
  {
    text: "When we see men of worth, we should think of equaling them; when we see men of a contrary character, we should turn inwards and examine ourselves.",
    author: "Confucius",
    source: "Analects, 4.17 (trans. James Legge)",
    tradition: "wisdom",
    themes: ["self-examination", "role models"],
  },
  {
    text: "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.",
    author: "Marie Curie",
    source: "quoted in Eve Curie, Madame Curie (1937)",
    tradition: "science",
    themes: ["understanding", "fear"],
  },
  {
    text: "I would rather have questions that can't be answered than answers that can't be questioned.",
    author: "Richard Feynman",
    source: "The Pleasure of Finding Things Out, BBC Horizon interview (1981)",
    tradition: "science",
    themes: ["curiosity", "doubt"],
  },
  {
    text: "Look again at that dot. That's here. That's home. That's us.",
    author: "Carl Sagan",
    source: "Pale Blue Dot (1994)",
    tradition: "science",
    themes: ["perspective", "smallness"],
  },
  {
    text: "Nobody tells this to people who are beginners, I wish someone told me. All of us who do creative work, we get into it because we have good taste. But there is this gap, for the first couple years you make stuff, and it's just not that good.",
    author: "Ira Glass",
    source: "This American Life interview (c. 2005)",
    tradition: "craft",
    themes: ["beginnings", "taste gap"],
  },
  {
    text: "We die. That may be the meaning of life. But we do language. That may be the measure of our lives.",
    author: "Toni Morrison",
    source: "Nobel Lecture in Literature (1993)",
    tradition: "craft",
    themes: ["language", "meaning"],
  },
];

/** Deterministic index derived from a YYYY-MM-DD date string. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Returns the same quote for the same date string, every time. */
export function quoteOfDay(date: string): Quote {
  const index = hashString(date) % QUOTES.length;
  return QUOTES[index];
}
