# OSGPrj Memory

Updated: 2026-03-12

## Project Identity

- Repository: current checkout of `osg-platform`
- Project name: `osg-platform`
- Business domain: finance-industry job training platform
- Repository type: RuoYi-based full-stack app plus OSG-specific frontend, specs, and delivery workflow assets

## Architecture At A Glance

- Backend is a multi-module Maven project:
  - `ruoyi-admin`
  - `ruoyi-framework`
  - `ruoyi-system`
  - `ruoyi-common`
  - `ruoyi-quartz`
  - `ruoyi-generator`
- Backend stack has been upgraded to `Java 21 + Spring Boot 3.5.x`
- There are two frontend tracks:
  - `ruoyi-ui`: legacy admin frontend on `Vue 2 + Element UI`
  - `osg-frontend`: new monorepo on `Vue 3 + Vite + TypeScript + Pinia + Ant Design Vue`
- `osg-frontend/packages/` contains:
  - `admin`
  - `student`
  - `mentor`
  - `lead-mentor`
  - `assistant`
  - `shared`

## Current Maturity Assessment

- The most mature OSG line is the new admin frontend in `osg-frontend/packages/admin`.
- It already covers:
  - login
  - permission gating
  - role management
  - admin user management
  - base data management
  - dashboard
- OSG-specific backend controllers already exist in:
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgDashboardController.java`
- Base data backend is still a minimal runnable implementation:
  - list and status change exist
  - data is still backed by in-memory seed rows
  - frontend-declared create, update, and categories APIs are not fully implemented server-side
- Student, mentor, lead-mentor, and assistant apps are still closer to prototypes or skeleton apps than fully integrated business clients

## Important Business Enhancements

- Password reset is a real project-specific enhancement, not just stock RuoYi behavior.
- It includes:
  - anonymous endpoints
  - send-code flow
  - Redis-backed reset code and reset token
  - mail sender integration
  - rate limiting on send-code
- Main files:
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysPasswordController.java`
  - `ruoyi-framework/src/main/java/com/ruoyi/framework/web/service/SysPasswordService.java`
  - `ruoyi-framework/src/main/java/com/ruoyi/framework/web/service/PasswordResetMailSender.java`

## Specs And Workflow System

- This repo contains heavy spec and delivery assets, not just product code.
- Important areas:
  - `.claude/memory/`
  - `.claude/project/config.yaml`
  - `osg-spec-docs/docs/`
  - `osg-spec-docs/tasks/`
  - `contracts/security-contract.yaml`
  - `deploy/runtime-contract.dev.yaml`
  - `bin/final-gate.sh`
- The project is using a specs-plus-gates workflow rather than a code-only workflow.

## Workflow State Snapshot

- `osg-spec-docs/tasks/STATE.yaml` currently shows:
  - `current_requirement: permission`
  - stories `S-001` through `S-007` completed
  - tickets `T-001` through `T-051` completed
  - workflow step at `all_stories_done`

## Key Decision Snapshot

- A central recorded decision is to reuse RuoYi's RBAC model instead of introducing a separate OSG-specific permission table model.

## Useful Paths

- Backend entry: `ruoyi-admin/`
- New admin frontend: `osg-frontend/packages/admin/`
- Legacy admin frontend: `ruoyi-ui/`
- Spec docs: `osg-spec-docs/docs/`
- Workflow state: `osg-spec-docs/tasks/STATE.yaml`
- Historical memory source: `.claude/memory/`

## Useful Commands

- Backend tests: `mvn test`
- Backend local repo workaround when needed: `mvn -Dmaven.repo.local=.m2/repository test`
- Backend dev run: `bash bin/run-backend-dev.sh deploy/.env.dev`
- New admin frontend tests: `pnpm --dir osg-frontend/packages/admin test`
- New admin frontend build: `pnpm --dir osg-frontend/packages/admin build`
- Monorepo build-all: `cd osg-frontend && pnpm build:all`
- E2E: `cd osg-frontend && pnpm test:e2e`
- Final gate: `bash bin/final-gate.sh permission`

## Environment Notes

- Some Windows PowerShell sessions may not expose `pnpm` on `PATH`.
- Sandbox environments may fail frontend Vitest runs with `spawn EPERM`; that does not automatically imply project code is broken.
- Maven may need a writable local repository override in some environments.

## 2026-03-12 Verification Notes

- Targeted backend tests previously passed for:
  - `OsgBaseDataControllerTest`
  - `OsgDashboardControllerTest`
  - `SysPasswordControllerTest`
- Current high-level conclusion:
  - the admin line is reasonably demoable
  - the multi-role apps are not yet equally mature
  - the main maintenance risk is dual-frontends plus uneven frontend/backend completion depth

## Source Files Behind This Summary

- `.claude/memory/decisions.yaml`
- `.claude/memory/project-audit.yaml`
- `.claude/memory/session.yaml`
- `.claude/project/config.yaml`
- `osg-spec-docs/tasks/STATE.yaml`
