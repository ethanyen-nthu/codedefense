import { difficulties, type Difficulty } from './schemas';
export const LEVELS = [
  {
    name: 'Fundamentals',
    description: 'Identify syntax, values, input/output, and simple conditions.',
    example: 'Which name is declared here, and what is its type?',
  },
  {
    name: 'Beginner',
    description: 'Explain loops, conditions, and individual function calls.',
    example: 'When is this while condition checked?',
  },
  {
    name: 'Normal TA',
    description: 'Explain your decisions, termination, and input boundaries.',
    example: 'Which statements move this loop toward its stopping condition?',
  },
  {
    name: 'Strict TA',
    description: 'Challenge assumptions and test counterexamples or modified conditions.',
    example: 'Would changing > to >= still allow this digit loop to terminate at zero?',
  },
  {
    name: 'Challenge',
    description: 'Justify correctness, termination, and cost where the source supports them.',
    example:
      'What invariant and decreasing quantity would justify this loop for nonnegative inputs?',
  },
] as const;
export function levelOf(difficulty: Difficulty) {
  return difficulties.indexOf(difficulty) + 1;
}
