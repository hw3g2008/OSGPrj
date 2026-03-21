# Frontend-UI Rule Classes Design

## Goal

Stop handling UI fidelity as one-off fixes. Every `frontend-ui` ticket should carry enough machine-readable rules to describe common UI work classes such as:

- page shell layout
- overlay surface layout
- control box model
- form spacing
- action content alignment
- iconography consistency

## Existing Entry Points

- Ticket generation: `.claude/skills/ticket-splitter/scripts/ticket_splitter_engine.py`
- Ticket schema reference: `.claude/templates/ticket.yaml`
- Story/ticket completeness guard: `.claude/skills/workflow-engine/tests/story_ticket_coverage_guard.py`
- UI visual contract guard: `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
- UI implementation workflow: `.claude/skills/deliver-ticket/SKILL.md`

## Recommended Design

### 1. Add rule classes to frontend-ui tickets

Introduce `ui_rule_classes` on `frontend-ui` tickets. This keeps the existing ticket as the only implementation artifact while making the rule set explicit.

Example classes:

- `page-shell`
- `overlay-surface-layout`
- `control-box-model`
- `form-spacing`
- `action-content-alignment`
- `iconography-consistency`

### 2. Tag style contracts with a rule class

Keep using existing `style_contracts`, but allow each contract rule to carry a `rule_class`. This avoids creating a second truth source while making each contract traceable to a UI concern.

### 3. Infer reusable rules from the prototype automatically

During ticket generation:

- keep extracting `visual_checklist`
- extract style contracts from:
  - root selectors
  - required anchors
  - semantic class selectors
  - root-prefixed descendant selectors for controls like `input`, `button`, `label`, `p`
- infer rule classes from selector/property combinations

This is what allows classless controls or descendant rules in the prototype to still show up in the generated ticket.

### 4. Enforce rule completeness in guards

The ticket coverage guard should reject `frontend-ui` tickets that are missing required rule classes or missing style contract coverage for those classes.

The UI visual contract guard should reject overlay form surfaces that omit baseline layout/style obligations such as:

- shell geometry
- body padding
- control box model
- spacing
- action alignment

## Regression Strategy

- `ticket_splitter_engine_selftest.py`
  - verifies generator emits `ui_rule_classes`
  - verifies control/layout contracts are inferred from prototype descendant selectors
- `story_ticket_coverage_guard_selftest.py`
  - verifies missing rule classes and missing rule coverage fail
- `ui_visual_contract_guard_style_state_test.py`
  - verifies valid overlay-form contracts pass
  - verifies missing archetype rules fail

## Expected Outcome

After regeneration, any `frontend-ui` ticket can tell the implementor what class of UI work it contains, and the framework can reject tickets/contracts that do not carry enough rule detail for those classes.
