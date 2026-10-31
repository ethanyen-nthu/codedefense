import {
  configSchema,
  emptyContext,
  type Analysis,
  type AnswerRecord,
  type Feedback,
  type InterviewConfig,
  type PracticeSession,
  type PublicQuestion,
  type Question,
} from './schemas';
import { sourceSlice } from './source';
import { finalScore } from './scoring';

export const DEMOS = [
  {
    name: 'Digit sum',
    code: `#include <iostream>
using namespace std;

int main() {
    int number;
    cin >> number;
    int temp = number;
    int sum = 0;
    while (temp > 0) {
        sum += temp % 10;
        temp /= 10;
    }
    cout << "Digit sum: " << sum << endl;
    return 0;
}`,
    summary:
      'For a successfully read positive int, this program repeatedly extracts decimal digits and prints their sum. Zero and negative values bypass the loop.',
    concepts: [
      ['Variables and data types', 5, 8],
      ['cin and cout', 6, 6],
      ['while loops', 9, 12],
      ['Modulo and integer division', 10, 11],
      ['Input validation', 5, 6],
    ] as const,
    risks: [
      'Interpretation: failed input extraction is not checked before number is used.',
      'Interpretation: negative input bypasses the loop; decide whether that fits the assignment.',
    ],
    seeds: [
      [
        'Why does temp % 10 extract a digit here?',
        'Modulo and integer division',
        10,
        10,
        'For nonnegative temp, the remainder after division by 10 is the last decimal digit.',
        ['remainder', 'last digit', '餘數', '個位'],
      ],
      [
        'Why use temp instead of changing number?',
        'Variables and data types',
        7,
        7,
        'temp is a copy. Changing it preserves the original value in number.',
        ['copy', 'preserv', '複製', '原本'],
      ],
      [
        'What makes this while loop terminate for positive input?',
        'while loops',
        9,
        12,
        'Integer division by 10 reduces positive temp until it reaches zero; the condition then becomes false.',
        ['zero', 'division', '0', '除'],
      ],
      [
        'For a successful input of 0, what is printed?',
        'while loops',
        8,
        13,
        'The condition is false immediately, so the program prints Digit sum: 0 followed by a newline.',
        ['0', 'skip', '不進'],
      ],
      [
        'For a successful input of -27, does the loop execute?',
        'while loops',
        9,
        12,
        'No. -27 > 0 is false, so sum remains zero.',
        ['false', 'no', 'zero', '不', '0'],
      ],
      [
        'Trace sum for a successful input of 123. What is printed?',
        'Modulo and integer division',
        8,
        13,
        'Digits 3, 2, 1 are added. The program prints Digit sum: 6 followed by a newline.',
        ['6', '3', '2', '1'],
      ],
      [
        'What happens if line 11 is removed, assuming positive input?',
        'while loops',
        9,
        12,
        'temp stops decreasing, so the condition stays true. Repeated sum addition can eventually overflow signed int, which is undefined behavior.',
        ['infinite', 'unchanged', 'overflow', '無限', '溢位'],
      ],
      [
        'Why must sum start at zero?',
        'Variables and data types',
        8,
        8,
        'Zero is the identity for addition and gives a defined starting accumulator.',
        ['zero', 'initial', '0', '初始'],
      ],
      [
        'How do % 10 and /= 10 play different roles?',
        'Modulo and integer division',
        10,
        11,
        'Modulo extracts the last digit; integer division removes it by truncating toward zero.',
        ['extract', 'remove', 'digit', '取', '去'],
      ],
      [
        'What input condition should be checked after cin?',
        'Input validation',
        5,
        6,
        'Check whether extraction succeeded, such as if (!(cin >> number)), before using number.',
        ['fail', 'success', 'check', '檢查', '成功'],
      ],
      [
        'Why is int appropriate for decimal digit extraction?',
        'Variables and data types',
        5,
        5,
        'It stores whole numbers, and integer remainder and division let the program extract decimal digits.',
        ['integer', 'whole', '整數'],
      ],
      [
        'Could a for loop express the same repeated operation? Explain.',
        'while loops',
        9,
        12,
        'Yes. A for loop can use temp > 0 as its condition and temp /= 10 as its update; a while loop is also natural here.',
        ['condition', 'update', 'yes', '可以'],
      ],
      [
        'What does the compound assignment sum += temp % 10 mean?',
        'Modulo and integer division',
        10,
        10,
        'It adds the remainder temp % 10 to the current sum, equivalent here to sum = sum + temp % 10.',
        ['add', 'sum =', '加'],
      ],
      [
        'After processing a successfully read positive number, what is temp?',
        'while loops',
        9,
        12,
        'temp is zero, because repeated integer division reaches zero and stops the loop.',
        ['zero', '0', '零'],
      ],
      [
        'What is the purpose of the output on line 13?',
        'cin and cout',
        13,
        13,
        'It writes the label and calculated sum to standard output, then endl writes a newline and flushes the stream.',
        ['output', 'sum', '輸出'],
      ],
    ] as const,
  },
  {
    name: 'Recursive factorial',
    code: `#include <iostream>
using namespace std;

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    int n;
    if (!(cin >> n) || n < 0 || n > 12) return 1;
    cout << factorial(n) << endl;
    return 0;
}`,
    summary:
      'This program validates an integer in [0,12] and recursively calculates its factorial. The upper bound assumes int can represent 12!, as on common 32-bit-int systems.',
    concepts: [
      ['Recursion', 4, 7],
      ['if and else', 5, 5],
      ['Functions', 4, 7],
      ['Parameters and return values', 4, 6],
      ['Input validation', 11, 11],
    ] as const,
    risks: [
      'Interpretation: the bound 12 assumes a sufficiently wide int; C++ only guarantees at least 16 bits.',
      'Interpretation: invalid input exits without a friendly explanation.',
    ],
    seeds: [
      [
        'What is the base case of factorial?',
        'Recursion',
        5,
        5,
        'When n <= 1, the function returns 1 without another recursive call.',
        ['1', 'base', '基本'],
      ],
      [
        'Why does factorial(n - 1) approach the base case for valid input?',
        'Recursion',
        5,
        6,
        'Each call decreases n by one until n <= 1.',
        ['decreas', 'one', '減', '1'],
      ],
      [
        'Trace factorial(3). What value returns?',
        'Recursion',
        4,
        7,
        'factorial(3) returns 3 * 2 * 1 = 6.',
        ['6', '3', '2'],
      ],
      [
        'Why is factorial(0) equal to 1 here?',
        'if and else',
        5,
        5,
        'The condition n <= 1 is true for zero, so the base case returns 1, matching 0! = 1.',
        ['1', 'true', '條件'],
      ],
      [
        'What does the int before factorial specify?',
        'Parameters and return values',
        4,
        4,
        'It specifies the function returns an integer value.',
        ['return', 'integer', '回傳', '整數'],
      ],
      [
        'What is passed to the recursive call?',
        'Parameters and return values',
        6,
        6,
        'The value n - 1 is passed as the next call’s local integer parameter.',
        ['n - 1', 'value', '值'],
      ],
      [
        'Why check n < 0 in main?',
        'Input validation',
        11,
        11,
        'This program defines factorial only for nonnegative integers; negative input should be rejected.',
        ['negative', 'reject', '負'],
      ],
      [
        'Why cap input at 12 on common 32-bit-int systems?',
        'Input validation',
        11,
        11,
        '13! exceeds the signed 32-bit int range. Signed overflow is undefined behavior.',
        ['overflow', 'range', '溢位', '範圍'],
      ],
      [
        'What if the base-case return were removed?',
        'Recursion',
        4,
        7,
        'Calls would continue past the intended base case; the program could exhaust stack resources or encounter signed arithmetic overflow.',
        ['stack', 'stop', 'overflow', '堆疊', '終止'],
      ],
      [
        'What does !(cin >> n) check?',
        'Input validation',
        11,
        11,
        'It tests whether integer input extraction failed. The OR condition short-circuits before using n when extraction fails.',
        ['fail', 'input', '失敗', '輸入'],
      ],
      [
        'Does each recursive call have its own n?',
        'Parameters and return values',
        4,
        6,
        'Yes. n is passed by value, so each call has its own parameter value.',
        ['value', 'own', 'copy', '值', '各自'],
      ],
      [
        'Why can main call factorial on line 12?',
        'Functions',
        4,
        12,
        'factorial is defined before main, making its name and signature available at the call.',
        ['before', 'defined', '前', '定義'],
      ],
      [
        'How many factorial calls occur for factorial(3)?',
        'Recursion',
        4,
        7,
        'Three calls: factorial(3), factorial(2), and factorial(1).',
        ['3', 'three', '三'],
      ],
      [
        'What input is accepted by the validation condition?',
        'Input validation',
        11,
        11,
        'Successfully extracted integers from 0 through 12, inclusive.',
        ['0', '12'],
      ],
      [
        'How could a loop calculate the same factorial?',
        'Functions',
        4,
        7,
        'Start a product at 1 and multiply by each integer from 2 through n; return the product.',
        ['multiply', 'product', '乘', '1'],
      ],
    ] as const,
  },
];
function publicQ(q: Question): PublicQuestion {
  const { id, text, concept, difficulty, evidence } = q;
  return { id, text, concept, difficulty, evidence };
}
function demoIndex(code: string) {
  const i = DEMOS.findIndex((d) => d.code === code);
  if (i < 0)
    throw new Error(
      'Demo uses only the built-in example programs. Choose an example or use live AI for your code.',
    );
  return i;
}
function questions(s: PracticeSession): Question[] {
  const d = DEMOS[demoIndex(s.code)];
  return d.seeds
    .map((seed, i) => ({
      id: `demo-${i}`,
      text: seed[0],
      concept: seed[1],
      difficulty: s.config.difficulty,
      evidence: { start: seed[2], end: seed[3], snippet: sourceSlice(d.code, seed[2], seed[3]) },
      expected: [seed[4]],
      rubric:
        'Illustrative demo only: keyword overlap chooses a sample score; it does not assess meaning.',
      hint: 'Look at the highlighted lines. Describe the operation and what changes after it.',
    }))
    .filter((q, i) =>
      s.retryQuestionIds ? s.retryQuestionIds.includes(q.id) : i < s.config.count,
    );
}
export function createDemo(index = 0): PracticeSession {
  const d = DEMOS[index];
  const analysis: Analysis = {
    summary: d.summary,
    concepts: d.concepts.map(([name, start, end]) => ({
      name,
      evidence: { start, end, snippet: sourceSlice(d.code, start, end) },
    })),
    review: [
      {
        explanation: 'Explain how the control flow changes on boundary inputs.',
        evidence: {
          start: d.concepts[0][1],
          end: d.concepts[0][2],
          snippet: sourceSlice(d.code, d.concepts[0][1], d.concepts[0][2]),
        },
      },
    ],
    risks: [...d.risks],
    difficulty: 'Normal TA',
  };
  return {
    id: crypto.randomUUID(),
    code: d.code,
    context: { ...emptyContext, title: d.name },
    analysis,
    config: configSchema.parse({}),
    demo: true,
    createdAt: new Date().toISOString(),
    expiresAt: '',
    index: 0,
    total: 0,
    stage: 'analysis',
    current: null,
    hint: null,
    records: [],
  };
}
export function startDemo(s: PracticeSession, config: InterviewConfig): PracticeSession {
  const next = {
    ...s,
    config,
    total: config.count,
    index: 0,
    records: [],
    stage: 'question' as const,
  };
  return { ...next, current: publicQ(questions(next)[0]) };
}
export function retryDemo(s: PracticeSession): PracticeSession {
  const ids = s.records.filter((r) => r.finalScore < 8).map((r) => r.question.id);
  const next = {
    ...s,
    id: crypto.randomUUID(),
    retryQuestionIds: ids,
    records: [],
    index: 0,
    total: ids.length,
    stage: 'question' as const,
    createdAt: new Date().toISOString(),
  };
  return { ...next, current: publicQ(questions(next)[0]) };
}
export function demoAction(
  session: PracticeSession,
  action: 'answer' | 'hint' | 'skip' | 'next',
  answer = '',
): PracticeSession {
  const s = structuredClone(session),
    q = questions(s)[s.index];
  if (action === 'hint') {
    s.hint = q.hint;
    return s;
  }
  if (action === 'next') {
    if (s.stage !== 'feedback') return s;
    const last = s.records.at(-1)!;
    if (last.initialScore < 8 && !last.skipped && !last.followUp) {
      s.stage = 'followup';
      s.current = {
        ...publicQ(q),
        id: `${q.id}-followup`,
        text: `Explain the reasoning behind your answer to: ${q.text}`,
      };
      s.hint = null;
      return s;
    }
    s.index++;
    s.current = s.index < s.total ? publicQ(questions(s)[s.index]) : null;
    s.stage = s.current ? 'question' : 'complete';
    s.hint = null;
    return s;
  }
  if (action === 'answer' && !answer.trim()) throw new Error('Write an answer first.');
  const seed = DEMOS[demoIndex(s.code)].seeds[Number(q.id.split('-')[1])];
  const matches = seed[5].filter((word) =>
    answer.toLowerCase().includes(word.toLowerCase()),
  ).length;
  const points = action === 'skip' ? 0 : matches >= 2 ? 10 : matches === 1 ? 6 : 0;
  const f: Feedback = {
    correctness: points === 10 ? 4 : points === 6 ? 3 : 0,
    understanding: points === 10 ? 4 : points === 6 ? 2 : 0,
    reasoning: points === 10 ? 2 : points === 6 ? 1 : 0,
    score: points,
    explanation:
      'Simulated feedback: this demo matches keywords, not meaning. Use live AI for a real explanation-based assessment.',
    missing: points < 10 ? q.expected : [],
    modelAnswer: q.expected.join(' '),
    expected: q.expected,
    rubric: q.rubric,
  };
  if (s.stage === 'followup') {
    const r = s.records.at(-1)!;
    r.followUp = {
      question: s.current!,
      answer: action === 'skip' ? '' : answer,
      feedback: f,
      skipped: action === 'skip',
    };
    r.finalScore = action === 'skip' ? r.initialScore : finalScore(r.initialScore, points);
  } else {
    const r: AnswerRecord = {
      question: publicQ(q),
      answer: action === 'skip' ? '' : answer,
      feedback: f,
      skipped: action === 'skip',
      initialScore: points,
      finalScore: points,
    };
    s.records.push(r);
  }
  s.stage = 'feedback';
  s.current = publicQ(q);
  s.hint = null;
  return s;
}
