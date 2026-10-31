# Question library review and extension

The initial Free Edition bank contains **99 distinct template prompts**, with unique stable IDs, one reference explanation, three distinct MC distractors, a construct category, difficulty, style preference, and an optional predefined follow-up. The author reviewed the language rules and avoided arbitrary submitted-program output prediction. Automated tests verify structure/uniqueness, source guards, evidence, answer-key placement, and selection; they do not prove every natural-language explanation correct.

The target is introductory C++11. A primary language reference for maintenance is the [public WG21 N3337 working draft](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2012/n3337.pdf), especially expressions, statements, declarations, functions, and library strings/iostreams. The bundled syntax grammar supports more syntax than C++11; parsing acceptance is not proof of C++11 conformance.

Review rules:

1. Require an actual parsed category and exact source evidence. Do not detect constructs by searching comments or strings for keywords.
2. If a prompt assumes extra structure, add a selector guard. Current examples: `% 10` digit processing, a break whose nearest target is a switch, continue inside a switch nested in a loop, conventional versus range-based for, and primitive-variable questions versus indirect/unknown types.
3. Keep the MC key determinable from the stated language rule and assumptions. Do not infer the exact purpose, runtime input, compiler success, or output of arbitrary student code.
4. State built-in-operator assumptions where overload resolution could change semantics. Treat unknown division types and self-call resolution conservatively.
5. Explain invalid arithmetic, signed overflow, and lifetime/bounds hazards without inventing a definite output for undefined behavior.
6. Keep written responses ungraded. References are checklists for the student; the tool does not judge prose meaning, English grammar, or Traditional Chinese phrasing.
7. Add a unique ID/prompt and three clearly incorrect alternatives. Test the new guard on both positive source and a near-miss source that must not select it.
8. Maintain deterministic seed behavior and category balance. Prefer fewer source-supported questions over padding to a requested count.

Fixed follow-up arithmetic examples such as `123 % 10 == 3` and `7 / 2 == 3` explicitly specify valid built-in positive int operands. They are not generated output traces and do not execute user code.

Known boundaries: simplified symbol evidence, no preprocessing/type-checking, no exhaustive call graph, no indirect/mutual recursion analysis, and no guarantee that a student’s code is semantically valid. Reference explanations and imported practice records remain reviewable study material, not official grades.
