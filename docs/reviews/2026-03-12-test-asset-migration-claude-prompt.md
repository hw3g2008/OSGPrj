# Claude Code Review Prompt

Review the framework-side migration work described in:

- [docs/reviews/2026-03-12-test-asset-migration-review-packet.md](/Users/hw/workspace/OSGPrj/docs/reviews/2026-03-12-test-asset-migration-review-packet.md)

Focus on:

1. whether the migration path is correctly separated from RPIV workflow state
2. whether `bin/sync-test-assets.py` now performs safe `tc_id`-based upsert without losing evidence
3. whether source-stage skill docs match the actual migration engine
4. whether the remaining `scenario obligation gap` findings are real coverage gaps or still framework mistakes

Files most relevant to inspect:

- [bin/sync-test-assets.py](/Users/hw/workspace/OSGPrj/bin/sync-test-assets.py)
- [bin/sync-test-assets-selftest.py](/Users/hw/workspace/OSGPrj/bin/sync-test-assets-selftest.py)
- [.claude/commands/migrate.md](/Users/hw/workspace/OSGPrj/.claude/commands/migrate.md)
- [.windsurf/workflows/migrate-test-assets.md](/Users/hw/workspace/OSGPrj/.windsurf/workflows/migrate-test-assets.md)
- [.claude/skills/story-splitter/SKILL.md](/Users/hw/workspace/OSGPrj/.claude/skills/story-splitter/SKILL.md)
- [.claude/skills/ticket-splitter/SKILL.md](/Users/hw/workspace/OSGPrj/.claude/skills/ticket-splitter/SKILL.md)
- [.claude/skills/workflow-engine/tests/test_asset_completeness_guard.py](/Users/hw/workspace/OSGPrj/.claude/skills/workflow-engine/tests/test_asset_completeness_guard.py)

Verified local commands already run:

```bash
python3 bin/sync-test-assets-selftest.py
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py
python3 bin/sync-test-assets.py --module permission
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module permission --story-id S-001
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module permission
```

Current status:

- migration engine works and selftests pass
- `S-001` guard passes
- full-module guard only fails on remaining `scenario obligation gap` findings

Please answer in code-review style:

- findings first
- ordered by severity
- include file references
- explicitly distinguish framework defects from real permission-module coverage gaps
