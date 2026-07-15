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
  // --- Batch 2: expanded verified pool (stoic) ---
  {
    text: "Take away thy opinion, and then there is taken away the complaint, 'I have been harmed.' Take away the complaint, 'I have been harmed,' and the harm is taken away.",
    author: "Marcus Aurelius",
    source: "Meditations, 4.7 (trans. George Long)",
    tradition: "stoic",
    themes: ["perception", "blame"],
  },
  {
    text: "Begin the morning by saying to thyself, I shall meet with the busy-body, the ungrateful, arrogant, deceitful, envious, unsocial.",
    author: "Marcus Aurelius",
    source: "Meditations, 2.1 (trans. George Long)",
    tradition: "stoic",
    themes: ["mornings", "equanimity"],
  },
  {
    text: "The best way of avenging thyself is not to become like the wrong doer.",
    author: "Marcus Aurelius",
    source: "Meditations, 6.6 (trans. George Long)",
    tradition: "stoic",
    themes: ["revenge", "virtue"],
  },
  {
    text: "While we are postponing, life speeds by.",
    author: "Seneca",
    source: "Letters to Lucilius (Epistulae Morales), Letter 1.2 (trans. Richard M. Gummere)",
    tradition: "stoic",
    themes: ["time", "procrastination"],
  },
  {
    text: "Treat your inferiors as you would be treated by your betters.",
    author: "Seneca",
    source: "Letters to Lucilius (Epistulae Morales), Letter 47.11 (trans. Richard M. Gummere)",
    tradition: "stoic",
    themes: ["kindness", "humility"],
  },
  {
    text: "Of things some are in our power, and others are not. In our power are opinion, movement towards a thing, desire, aversion; and, in a word, whatever are our own acts: not in our power are the body, property, reputation, offices, and, in a word, whatever are not our own acts.",
    author: "Epictetus",
    source: "Enchiridion, 1 (trans. George Long)",
    tradition: "stoic",
    themes: ["control", "acceptance"],
  },
  {
    text: "Such as are thy habitual thoughts, such also will be the character of thy mind; for the soul is dyed by the thoughts.",
    author: "Marcus Aurelius",
    source: "Meditations, 5.16 (trans. George Long)",
    tradition: "stoic",
    themes: ["thoughts", "character"],
  },
  {
    text: "Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are, and you will have a tranquil flow of life.",
    author: "Epictetus",
    source: "Enchiridion, 8 (trans. George Long)",
    tradition: "stoic",
    themes: ["acceptance", "fate"],
  },
  {
    text: "Wipe out the imagination. Stop the pulling of the strings. Confine thyself to the present. Understand well what happens either to thee or to another.",
    author: "Marcus Aurelius",
    source: "Meditations, 7.29 (trans. George Long)",
    tradition: "stoic",
    themes: ["focus", "present"],
  },
  {
    text: "It is not the man who has too little, but the man who craves more, that is poor.",
    author: "Seneca",
    source: "Letters to Lucilius (Epistulae Morales), Letter 2.6 (trans. Richard M. Gummere)",
    tradition: "stoic",
    themes: ["contentment", "desire"],
  },
  {
    text: "No longer talk at all about the kind of man that a good man ought to be, but be such.",
    author: "Marcus Aurelius",
    source: "Meditations, 10.16 (trans. George Long)",
    tradition: "stoic",
    themes: ["virtue", "action"],
  },
  {
    text: "Be like the promontory against which the waves continually break, but it stands firm and tames the fury of the water around it.",
    author: "Marcus Aurelius",
    source: "Meditations, 4.49 (trans. George Long)",
    tradition: "stoic",
    themes: ["steadiness", "resilience"],
  },
  // --- Batch 2: expanded verified pool (wisdom) ---
  {
    text: "The journey of a thousand li commenced with a single step.",
    author: "Laozi",
    source: "Tao Te Ching, ch. 64 (trans. James Legge, 1891)",
    tradition: "wisdom",
    themes: ["beginnings", "perseverance"],
  },
  {
    text: "You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions.",
    author: "Bhagavad Gita",
    source: "Bhagavad Gita 2.47 (trans. A. C. Bhaktivedanta Swami Prabhupada, Bhagavad-gītā As It Is)",
    tradition: "wisdom",
    themes: ["duty", "detachment"],
  },
  {
    text: "To every thing there is a season, and a time to every purpose under the heaven.",
    author: "Ecclesiastes",
    source: "Ecclesiastes 3:1 (KJV)",
    tradition: "wisdom",
    themes: ["time", "seasons"],
  },
  {
    text: "The work is not upon thee to finish, nor art thou free to desist from it.",
    author: "Rabbi Tarfon",
    source: "Mishnah, Pirkei Avot 2:16 (trans. R. Travers Herford, Pirke Aboth, 1925)",
    tradition: "wisdom",
    themes: ["duty", "perseverance"],
  },
  {
    text: "What you do not want done to yourself, do not do to others.",
    author: "Confucius",
    source: "Analects, 15.24 (trans. James Legge)",
    tradition: "wisdom",
    themes: ["reciprocity", "ethics"],
  },
  {
    text: "Hatred does not cease by hatred at any time: hatred ceases by love, this is an old rule.",
    author: "Gautama Buddha",
    source: "Dhammapada, 5 (trans. Max Müller)",
    tradition: "wisdom",
    themes: ["hatred", "love"],
  },
  {
    text: "Not to commit any sin, to do good, and to purify one's mind, that is the teaching of all the Awakened.",
    author: "Gautama Buddha",
    source: "Dhammapada, 183 (trans. Max Müller)",
    tradition: "wisdom",
    themes: ["virtue", "mind"],
  },
  {
    text: "He who knows other men is discerning; he who knows himself is intelligent.",
    author: "Laozi",
    source: "Tao Te Ching, ch. 33 (trans. James Legge, 1891)",
    tradition: "wisdom",
    themes: ["self-knowledge", "wisdom"],
  },
  {
    text: "At fifteen, I had my mind bent on learning. At thirty, I stood firm. At forty, I had no doubts. At fifty, I knew the decrees of Heaven. At sixty, my ear was an obedient organ for the reception of truth. At seventy, I could follow what my heart desired, without transgressing what was right.",
    author: "Confucius",
    source: "Analects, 2.4 (trans. James Legge)",
    tradition: "wisdom",
    themes: ["growth", "learning"],
  },
  {
    text: "A man's heart deviseth his way: but the LORD directeth his steps.",
    author: "Proverbs",
    source: "Proverbs 16:9 (KJV)",
    tradition: "wisdom",
    themes: ["planning", "humility"],
  },
  {
    text: "One must deliver himself with the help of his mind, and not degrade himself. The mind is the friend of the conditioned soul, and his enemy as well.",
    author: "Bhagavad Gita",
    source: "Bhagavad Gita 6.5 (trans. A. C. Bhaktivedanta Swami Prabhupada, Bhagavad-gītā As It Is)",
    tradition: "wisdom",
    themes: ["mind", "self-mastery"],
  },
  {
    text: "I daily examine myself on three points: whether, in transacting business for others, I may have been not faithful; whether, in intercourse with friends, I may have been not sincere; whether I may have not mastered and practiced the instructions of my teacher.",
    author: "Confucius",
    source: "Analects, 1.4 (trans. James Legge)",
    tradition: "wisdom",
    themes: ["self-examination", "integrity"],
  },
  // --- Batch 2: expanded verified pool (science) ---
  {
    text: "There is grandeur in this view of life, with its several powers, having been originally breathed into a few forms or into one; and that, whilst this planet has gone cycling on according to the fixed law of gravity, from so simple a beginning endless forms most beautiful and most wonderful have been, and are being, evolved.",
    author: "Charles Darwin",
    source: "On the Origin of Species, closing paragraph (1st ed., 1859)",
    tradition: "science",
    themes: ["wonder", "evolution"],
  },
  {
    text: "If I have seen further it is by standing on the shoulders of Giants.",
    author: "Isaac Newton",
    source: "Letter to Robert Hooke (5 February 1675)",
    tradition: "science",
    themes: ["humility", "knowledge"],
  },
  {
    text: "In the fields of observation, chance favors only the prepared mind.",
    author: "Louis Pasteur",
    source: "Inaugural lecture, University of Lille (7 December 1854)",
    tradition: "science",
    themes: ["preparation", "discovery"],
  },
  {
    text: "What I cannot create, I do not understand.",
    author: "Richard Feynman",
    source: "blackboard at time of death, February 1988 (Caltech Archives; repr. No Ordinary Genius, ed. Christopher Sykes, 1996)",
    tradition: "science",
    themes: ["understanding", "creation"],
  },
  {
    text: "The first principle is that you must not fool yourself—and you are the easiest person to fool.",
    author: "Richard Feynman",
    source: "\"Cargo Cult Science,\" Caltech commencement address (1974)",
    tradition: "science",
    themes: ["honesty", "self-doubt"],
  },
  {
    text: "The Analytical Engine has no pretensions whatever to originate any thing. It can do whatever we know how to order it to perform.",
    author: "Ada Lovelace",
    source: "Notes on the Analytical Engine, Note G (1843)",
    tradition: "science",
    themes: ["computing", "limits"],
  },
  {
    text: "It is a wholesome and necessary thing for us to turn again to the earth and in the contemplation of her beauties to know the sense of wonder and humility.",
    author: "Rachel Carson",
    source: "The Sense of Wonder (1965)",
    tradition: "science",
    themes: ["wonder", "humility"],
  },
  {
    text: "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    author: "Alan Turing",
    source: "\"Computing Machinery and Intelligence,\" Mind, vol. 59 (1950)",
    tradition: "science",
    themes: ["progress", "work"],
  },
  {
    text: "Ignorance more frequently begets confidence than does knowledge: it is those who know little, and not those who know much, who so positively assert that this or that problem will never be solved by science.",
    author: "Charles Darwin",
    source: "The Descent of Man, Introduction (1871)",
    tradition: "science",
    themes: ["humility", "knowledge"],
  },
  {
    text: "The universe is under no obligation to make sense to you.",
    author: "Neil deGrasse Tyson",
    source: "Astrophysics for People in a Hurry, Preface (2017)",
    tradition: "science",
    themes: ["reality", "humility"],
  },
  {
    text: "If we find the answer to that, it would be the ultimate triumph of human reason—for then we should know the mind of God.",
    author: "Stephen Hawking",
    source: "A Brief History of Time, closing lines (1988)",
    tradition: "science",
    themes: ["curiosity", "meaning"],
  },
  // --- Batch 2: expanded verified pool (craft) ---
  {
    text: "Perfectionism is the voice of the oppressor, the enemy of the people. It will keep you cramped and insane your whole life.",
    author: "Anne Lamott",
    source: "Bird by Bird: Some Instructions on Writing and Life, ch. \"Perfectionism\" (1994)",
    tradition: "craft",
    themes: ["perfectionism", "drafts"],
  },
  {
    text: "Practicing an art, no matter how well or badly, is a way to make your soul grow, for heaven's sake.",
    author: "Kurt Vonnegut",
    source: "A Man Without a Country (2005)",
    tradition: "craft",
    themes: ["creativity", "growth"],
  },
  {
    text: "You put one word after another until it's finished—whatever it is.",
    author: "Neil Gaiman",
    source: "\"Where Do You Get Your Ideas?\" (essay, neilgaiman.com)",
    tradition: "craft",
    themes: ["persistence", "process"],
  },
  {
    text: "Write with the door closed, rewrite with the door open.",
    author: "Stephen King",
    source: "On Writing: A Memoir of the Craft (2000)",
    tradition: "craft",
    themes: ["drafting", "revision"],
  },
  {
    text: "Inspiration is for amateurs—the rest of us just show up and get to work.",
    author: "Chuck Close",
    source: "interview with Joe Fig, in Inside the Painter's Studio (2009)",
    tradition: "craft",
    themes: ["discipline", "work"],
  },
  {
    text: "A sentence should contain no unnecessary words, a paragraph no unnecessary sentences, for the same reason that a drawing should have no unnecessary lines and a machine no unnecessary parts.",
    author: "William Strunk Jr. and E. B. White",
    source: "The Elements of Style, Rule 17 \"Omit Needless Words\"",
    tradition: "craft",
    themes: ["clarity", "economy"],
  },
  {
    text: "Creativity is a habit, and the best creativity is a result of good work habits.",
    author: "Twyla Tharp",
    source: "The Creative Habit: Learn It and Use It for Life (2003)",
    tradition: "craft",
    themes: ["habit", "discipline"],
  },
  {
    text: "What separates artists from ex-artists is that those who challenge their fears, continue; those who don't, quit.",
    author: "David Bayles and Ted Orland",
    source: "Art & Fear: Observations on the Perils (and Rewards) of Artmaking (1993)",
    tradition: "craft",
    themes: ["fear", "persistence"],
  },
  {
    text: "I write entirely to find out what I'm thinking, what I'm looking at, what I see and what it means.",
    author: "Joan Didion",
    source: "\"Why I Write,\" New York Times Book Review (1976)",
    tradition: "craft",
    themes: ["writing", "self-discovery"],
  },
  {
    text: "We live in capitalism, its power seems inescapable — but then, so did the divine right of kings. Any human power can be resisted and changed by human beings.",
    author: "Ursula K. Le Guin",
    source: "National Book Award acceptance speech (2014)",
    tradition: "craft",
    themes: ["freedom", "resistance"],
  },
  {
    text: "Don't romanticise your \"vocation\". You can either write good sentences or you can't. There is no \"writer's lifestyle\". All that matters is what you leave on the page.",
    author: "Zadie Smith",
    source: "\"Ten Rules for Writing Fiction,\" The Guardian (2010)",
    tradition: "craft",
    themes: ["craft", "discipline"],
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

/** Normalize text for deduplication: trim, collapse whitespace, lowercase. */
function normalize(t: string): string {
  return t.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Module-level store for remote quotes. */
let remote: Quote[] = [];

/** Sets the remote quotes, filtering out any without a non-empty source. */
export function setRemoteQuotes(quotes: Quote[]): void {
  remote = quotes.filter((q) => q.source && q.source.trim().length > 0);
}

/** Returns bundled QUOTES ∪ remote, deduped by normalized text; bundled wins on collision. */
export function allQuotes(): Quote[] {
  const seen = new Set(QUOTES.map((q) => normalize(q.text)));
  const merged = [...QUOTES];
  for (const q of remote) {
    const key = normalize(q.text);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ ...q, text: q.text.trim() });
    }
  }
  return merged;
}

/** Returns the same quote for the same date string, every time. */
export function quoteOfDay(date: string): Quote {
  const pool = allQuotes();
  return pool[hashString(date) % pool.length];
}
