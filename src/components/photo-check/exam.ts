// A dummy written exam for the photo check screens. No answer is ever checked.

export type QuestionKind = "cq" | "sq";

export interface Question {
  key: string;
  n: number;
  kind: QuestionKind;
  group: string | null;
  /** Section title, shown in the page header. */
  title: string;
  /** "সৃজনশীল প্রশ্ন 1" or "প্রশ্ন 1". */
  label: string;
  /** "ক-বিভাগ · সৃজনশীল প্রশ্ন 1", under the page title. */
  sub: string;
  /** "প্রশ্ন 1", on each photo row. */
  short: string;
  /** "ক-বিভাগ • প্রশ্ন ১", on the submission review. */
  reviewName: string;
}

export interface Section {
  title: string;
  note: string;
  hint?: string;
  fullMarks: string;
  groups: { name: string | null; questions: Question[] }[];
}

export const STEM = "একটি স্কাউট দলকে ৮, ১০ ও ১২ সারিতে সাজানো যায় কিন্তু বর্গাকারে সাজানো যায় না।";
export const PARTS = [
  "ক. ১২ এর গুণনীয়ক গুলো নির্ণয় কর। (২ মার্ক)",
  "খ. ঐ স্কাউট দলে কমপক্ষে কতজন স্কাউট আছে এবং কোন ক্ষুদ্রতম সংখ্যা দ্বারা গুণ করলে স্কাউট দলকে বর্গাকারে সাজানো যাবে? (৪ মার্ক)",
  "গ. ঐ স্কাউট দলে কমপক্ষে কতজন স্কাউট যোগদিলে দলটিকে বর্গাকারে সাজানো যাবে। (৪ মার্ক)",
];
export const SHORT_QUESTIONS = [
  "১২ এর গুণনীয়ক গুলো নির্ণয় কর।",
  "৮, ১০ ও ১২ এর ল.সা.গু নির্ণয় কর।",
  "১২০ কে কোন ক্ষুদ্রতম সংখ্যা দ্বারা গুণ করলে গুণফল একটি পূর্ণবর্গ সংখ্যা হবে?",
];

export const bn = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

const CQ_TITLE = "সৃজনশীল প্রশ্ন";
const SQ_TITLE = "সংক্ষিপ্ত প্রশ্ন";

function cq(group: string, id: string, n: number): Question {
  return {
    key: `${id}-${n}`,
    n,
    kind: "cq",
    group,
    title: CQ_TITLE,
    label: `সৃজনশীল প্রশ্ন ${n}`,
    sub: `${group} · সৃজনশীল প্রশ্ন ${n}`,
    short: `প্রশ্ন ${n}`,
    reviewName: `${group} • প্রশ্ন ${bn(n)}`,
  };
}

function sq(n: number): Question {
  return {
    key: `sq-${n}`,
    n,
    kind: "sq",
    group: null,
    title: SQ_TITLE,
    label: `প্রশ্ন ${n}`,
    sub: `সংক্ষিপ্ত প্রশ্ন · প্রশ্ন ${n}`,
    short: `প্রশ্ন ${n}`,
    reviewName: `প্রশ্ন ${bn(n)}`,
  };
}

export const SECTIONS: Section[] = [
  {
    title: CQ_TITLE,
    note: "[দ্রষ্টব্য: প্রত্যেক বিভাগ থেকে ন্যূনতম একটি করে মোট তিনটি প্রশ্নের উত্তর দিতে হবে।] - পূর্ণমান: ৩০",
    hint: "খাতায় লিখে ছবি তুলে ফাইল আপলোড করো",
    fullMarks: "৩০",
    groups: [
      ["ক-বিভাগ", "ka"],
      ["খ-বিভাগ", "kha"],
      ["গ-বিভাগ", "ga"],
    ].map(([name, id]) => ({ name, questions: [1, 2].map((n) => cq(name, id, n)) })),
  },
  {
    title: SQ_TITLE,
    note: "[দ্রষ্টব্য: মোট তিনটি প্রশ্নের উত্তর দিতে হবে।] - পূর্ণমান: ৩০",
    fullMarks: "৩০",
    groups: [{ name: null, questions: [1, 2, 3].map(sq) }],
  },
];

export const QUESTIONS: Record<string, Question> = {};
export const ORDER: string[] = [];
for (const section of SECTIONS) {
  for (const group of section.groups) {
    for (const q of group.questions) {
      QUESTIONS[q.key] = q;
      ORDER.push(q.key);
    }
  }
}
