# CodeTA question-library review

The 155-template library contains the original 99 audited entries and 56 new entries. This is an engineering/content review, not an external certification or instructor endorsement. No current official NTHU syllabus is claimed.

## Audit and changes

All original prompts, explanations and three distractors were read for C++11 rules, unsupported assumptions, difficulty and duplication. Weak distractors around declarations, input types, branches, loops, arrays, recursion, arithmetic and transfers were rewritten toward common misconceptions. Explanations distinguish built-in numeric rules from unresolved overloads and general syntax from actual reachability. Source-specific prompts never assert programmer intent from a variable name.

Notable corrected items: accumulator questions require an initializer and a later matching += with unambiguous local-name evidence; primitive-copy questions require direct primitive evidence; reference and value parameter rules are guarded separately; conventional-for rules exclude range loops and omitted-condition questions; decimal-digit rules require an actual divisor 10; switch-break/continue-while rules require the correct syntactic target. The former unsupported array-to-pointer and dangling-reference questions were replaced with array-bound and block-lifetime questions. Generic optional changes are explicitly labeled hypothetical. Function name lookup wording avoids an absolute “every declaration must occur earlier” claim for all contexts.

All five difficulty levels have real content. Selection prefers the chosen level, then related foundation content, rotates concepts, and deduplicates related objective families. Simple programs are allowed smaller pools. Explicit mode/topic filters never pad the pool with unrelated constructs.

## Source and rule boundaries

The analyzer attaches structured tags, exact expressions/conditions and line evidence from actual AST nodes. Selection never examines a prompt’s English wording to decide if it is supported. It does not preprocess macros, compile, execute, resolve all types, prove a base case, infer algorithm purpose or prove complexity.

Language-rule questions explicitly state their built-in type assumptions. Source-grounded correctness/termination prompts ask students to supply evidence, not claim the parser proved an invariant. What-if prompts state the changed condition or snippet. Code Tracing exclusively selects fixed, reviewed examples. MC options have one intended correct rule; keys and explanations remain inspectable locally.

## Verified small traces

| Fixed example                         | Derivation                           |
| ------------------------------------- | ------------------------------------ |
| sum of i for i=0,1,2                  | 0+1+2 = 3                            |
| n=23, repeated n/=10 while n>0        | 23 → 2 → 0; two passes               |
| count=0; do ++count while(false)      | one body execution; count=1          |
| -23 % 10                              | truncating quotient -2, remainder -3 |
| double x=7/2                          | int quotient 3, converted to 3.0     |
| sum array {2,4,6} using i<3           | accesses 0,1,2; total 12             |
| f(0)=1; f(n)=n*f(n-1), evaluated at 3 | 3*2*1*1 = 6                          |
| i<4 with j<i                          | 0+1+2+3 = 6 visits                   |

These exact small values fit even the minimum required C++11 int range. They are prebuilt examples; no result is transferred to an arbitrary submitted program. Demo factorial input is bounded to 0–7 for portability. User code can still be semantically invalid despite a successful syntax parse.

## References and maintenance

Primary language reference: the public [WG21 N3337 C++ working draft](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2012/n3337.pdf), especially expressions, statements, declarations, scope, storage duration and conversions. N3337 is a post-C++11 working draft, not a claim that this parser performs full conformance checking.

For each new entry: identify the supported source kind/tags, state input/type assumptions, check the rule against the C++11 baseline, write one key and three false alternatives, provide a beginner explanation, mark its grounding and format, avoid a duplicate objective family, and test the guard against negative examples. Keep semantic output prediction disabled. Never add content simply to increase the count.
