# Output Contract

Use this file when generating concrete ticket/test assets with the `acceptance-ticket-splitter` skill.

## Ticket Output Minimum

Each generated ticket must clearly express:

- behavior unit
- stage in the flow
- affected files or runtime surfaces
- upstream input
- downstream consumer
- explicit non-goals

## Test Case Output Minimum

Each generated `ticket.test_cases` entry should be detailed enough to support direct acceptance execution.

At minimum, capture:

- `objective`
- `preconditions`
- `test_data`
- `steps`
- `expected_results`
- `forbidden_results`
- `evidence_level`
- `branch_coverage`
- `boundary_coverage`
- `acceptance_rule`

## Evidence Levels

Use one or more of:

- `service`
- `controller`
- `frontend_contract`
- `playwright_e2e`
- `cross_end_acceptance`

## Anti-Fake Assertion Checklist

Every generated asset set should answer:

- Which truth source backs each primary assertion?
- Which cases prove forbidden results do not occur?
- Which cases require RED before GREEN?
- Which branch and boundary families are covered?
- Which concrete entities are bound in cross-end cases?
