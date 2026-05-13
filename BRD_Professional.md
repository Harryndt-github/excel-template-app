# Business Requirements Document

## Project Name
`Excel Template App - Master Data, Rate Center & Policy Advisory`

## Document Control

### Document Information

| Item | Value |
|---|---|
| Document Title | Business Requirements Document |
| Project Name | Excel Template App |
| Business Domain | Mortgage / Real Estate Lending |
| Version | v1.0 |
| Date | 2026-05-13 |
| Prepared By | Codex |
| Status | Draft |

### Document History

| Version | Date | Author | Description of Changes |
|---|---|---|---|
| v1.0 | 2026-05-13 | Codex | Initial BRD prepared based on current project codebase and business discussions |

### Approvals

| Role | Name | Status |
|---|---|---|
| Business Owner | TBD | Pending |
| Product Owner | TBD | Pending |
| IT Lead | TBD | Pending |
| Risk / Compliance | TBD | Pending |

## 1. Executive Summary

The solution is a browser-based business application used to manage templates, master data, lending policy configuration, and policy advisory for real estate financing programs. The main business objective is to standardize document generation and centralize sales policy setup per project, including lending rate, support interest policy, insurance fee policy, grace period rules, exceptions, and advisory scoring.

The current codebase supports:

- Template creation and generation for Excel-like and Word templates.
- Import of source data from Excel, CSV, and Word files.
- Master Data management for reusable business entities.
- Rate Center management by `Project > Sales Policy`.
- Policy-level configuration for:
  - Interest rate matrix
  - Interest support policy
  - Personal accident insurance fee (`Phi TNTH`)
  - Grace period rules
  - Rate adjustment rules
  - Project exceptions
- Mini master for reusable `Interest Support Policy` and `Fee Policy`.
- A browser-only policy advisory engine for ranking policies.

Important note: the current project does **not** implement a true LLM integration. The advisory module currently uses deterministic scoring logic such as dynamic weights, sigmoid scoring, cosine similarity, and softmax normalization. Any `LLM-assisted policy authoring` should therefore be positioned as a future enhancement, not as an existing delivered feature.

## 2. Business Context

Banks partnering with real estate developers need to deploy multiple lending programs across many projects. Each project may contain multiple sales policies, each with different interest rate timelines, support interest arrangements, fee structures, grace rules, and customer eligibility conditions.

In the current operating model, business users often re-enter repetitive policy parameters, manually update templates, and risk inconsistencies between lending configuration and generated documents. The target solution centralizes those configurations and uses them as trusted sources when generating customer-facing and internal documents.

## 3. Problem Statement

The business needs a configurable system that can:

- Maintain reusable sales policy data at project level.
- Distinguish clearly between:
  - bank interest rate
  - developer-supported interest period
  - customer-paid interest period
  - principal repayment obligation
- Avoid repetitive configuration of common support interest and fee policies.
- Generate templates using the correct policy-derived values.
- Provide policy recommendations to users based on customer and loan parameters.

## 4. Business Objectives

| ID | Objective | Success Outcome |
|---|---|---|
| BO-01 | Standardize policy data used in documents | Fewer manual edits and reduced policy mismatch |
| BO-02 | Reuse common support and fee configurations | Lower setup effort across similar projects |
| BO-03 | Improve lending document accuracy | Correct values injected into templates from centralized policy data |
| BO-04 | Improve policy selection speed | Business users can compare and shortlist policies faster |
| BO-05 | Keep deployment lightweight | Entire solution works in browser without backend dependency |

## 5. Scope

### 5.1 In Scope

- Manage Excel-like templates.
- Manage Word templates.
- Import source data from Excel, CSV, and Word.
- Manage reusable master data entities and records.
- Manage Rate Center with structure `Project > Sales Policy`.
- Manage:
  - Interest rate matrix
  - Interest support policy
  - Insurance fee policy (`Phi TNTH`)
  - Grace period rules
  - Rate adjustment rules
  - Exceptions
- Use mini master for reusable support and fee policies.
- Generate derived policy fields through rule engine.
- Provide policy advisory and Top-5 ranking.

### 5.2 Out of Scope for Current Release

- Centralized backend database.
- Multi-user live collaboration.
- Role-based access management.
- Approval workflow.
- Integration with Core Banking / LOS / LMS / DWH.
- Audit trail on server.
- True LLM integration or external AI API calls.

## 6. Stakeholders and RACI

### 6.1 Stakeholders

| Stakeholder | Role in Business |
|---|---|
| Product Owner | Defines product direction and priorities |
| Credit Product Team | Owns lending programs and policy structure |
| Sales Support Team | Configures project and sales policy data |
| Credit Operations Team | Uses generated outputs and validates data |
| Document Operations Team | Maintains templates and output formats |
| IT / Engineering | Builds and maintains the application |
| Risk / Compliance | Reviews business rules and policy constraints |

### 6.2 RACI Matrix

| Deliverable / Decision | Product Owner | Credit Product | Sales Support | Operations | IT | Risk |
|---|---|---|---|---|---|---|
| BRD Sign-off | A | C | C | C | C | C |
| Sales Policy Structure | C | A | R | C | C | C |
| Template Design | C | C | C | A/R | C | I |
| Rate Center Configuration | I | A | R | C | I | C |
| Mini Master Governance | C | A | R | C | I | C |
| Advisory Logic | A | C | C | C | R | C |
| Release Implementation | I | I | I | I | A/R | I |

## 7. Assumptions and Constraints

### 7.1 Assumptions

- Users understand lending policy terminology.
- Policy data can be maintained locally within the browser environment for current release.
- Imported source files are sufficiently aligned with configured data structure.

### 7.2 Constraints

- Data persistence is based on local browser storage.
- No centralized synchronization exists in current release.
- Changes are local to the executing browser context.

## 8. Current State vs Target State

### 8.1 Current State

- Policy logic is fragmented and may require repeated data entry.
- Template outputs depend on manual mapping and ad hoc policy interpretation.
- Common support and fee configurations may be duplicated across multiple sales policies.

### 8.2 Target State

- Sales policy data is centrally configured in Rate Center.
- Reusable support and fee policies are selected from mini master.
- Rule engine derives correct lending values for templates.
- Advisory module ranks policies consistently based on business inputs.

## 9. Actors

| Actor | Description |
|---|---|
| Business User | Configures project, policy, and master data |
| Template User | Builds templates and mappings |
| Credit Advisor | Uses policy advisory for shortlist decision |
| System | Applies rule engine and generates outputs |

## 10. Glossary

| Term | Definition |
|---|---|
| Sales Policy | Business lending package configured for a project |
| Rate Center | Master data module managing interest-related policy configuration |
| Interest Support Policy | Policy describing whether and how long developer supports interest payment |
| Fee Policy | Reusable policy for TNTH fee configuration |
| Bucket | A rate row applicable up to a maximum number of months |
| Grace Period | Maximum principal grace allowed by policy rules |
| TNTH | Personal accident insurance fee configuration |
| Advisory | Function that ranks sales policies based on input profile |
| Mini Master | Shared catalog of reusable support/fee policies |

## 11. Business Process Overview

### 11.1 Policy Configuration Process

1. User creates a project.
2. User creates a sales policy under the project.
3. User configures:
   - basic policy information
   - rate buckets
   - support interest policy
   - fee policy
   - grace rules
   - rate adjustment rules
   - exceptions
4. User optionally saves support/fee settings into reusable mini master.

### 11.2 Template Generation Process

1. User selects or creates template.
2. User uploads source file(s).
3. User maps placeholders to:
   - imported source data
   - master data
   - rate center fields
   - derived rule engine fields
4. User selects project and sales policy.
5. System derives runtime values.
6. System generates output document.

### 11.3 Policy Advisory Process

1. User enters customer / loan parameters.
2. System scans all policies in Rate Center.
3. System computes ranking scores.
4. System returns Top-5 candidate policies with explanation.

## 12. Business Rules

| Rule ID | Business Rule | Type |
|---|---|---|
| BR-01 | One project may contain multiple sales policies | Structural |
| BR-02 | One sales policy may contain multiple rate buckets | Structural |
| BR-03 | Rate bucket is selected using the smallest bucket where `maxMonths >= applicable duration` | Computation |
| BR-04 | Rate matrix manages bank interest rate and margin only | Structural |
| BR-05 | Interest support is configured at sales policy level, not per rate row | Structural |
| BR-06 | If interest support is enabled, developer pays interest for configured support duration | Computation |
| BR-07 | Customer starts paying interest from support end + 1 month | Computation |
| BR-08 | Principal repayment remains customer obligation unless otherwise configured | Policy |
| BR-09 | TNTH fee is determined by policy phase and current loan month | Computation |
| BR-10 | Adjustment rules apply only when all configured conditions match | Computation |
| BR-11 | Project exception has higher priority than group-based grace rule | Priority |
| BR-12 | Reusable support/fee policy may be selected into multiple sales policies | Reuse |

## 13. Functional Requirements Catalogue

### FR-01 Template Management

| Item | Description |
|---|---|
| Requirement ID | FR-01 |
| Name | Manage Excel-like Templates |
| Business Area | Template Management |
| Priority | Must Have |
| Description | System shall allow users to create, edit, duplicate, delete, and save Excel-like templates with placeholders |
| Acceptance Criteria | User can create template, insert placeholders, save, reopen, duplicate, and delete |

### FR-02 Word Template Management

| Item | Description |
|---|---|
| Requirement ID | FR-02 |
| Name | Manage Word Templates |
| Business Area | Template Management |
| Priority | Must Have |
| Description | System shall allow users to upload, edit, store, map, and generate Word templates |
| Acceptance Criteria | User can upload Word file, extract placeholders, map fields, and generate result |

### FR-03 Source Data Import

| Item | Description |
|---|---|
| Requirement ID | FR-03 |
| Name | Import Source Data |
| Business Area | Data Intake |
| Priority | Must Have |
| Description | System shall import Excel, CSV, and Word data as mapping sources |
| Acceptance Criteria | User can upload valid file and system extracts fields for mapping |

### FR-04 Master Data Management

| Item | Description |
|---|---|
| Requirement ID | FR-04 |
| Name | Manage Master Data Entities and Records |
| Business Area | Master Data |
| Priority | Must Have |
| Description | System shall allow user to maintain reusable entity structures and records |
| Acceptance Criteria | User can create entity, add record, import/export record template, and use records in mapping |

### FR-05 Rate Center Project Management

| Item | Description |
|---|---|
| Requirement ID | FR-05 |
| Name | Manage Projects in Rate Center |
| Business Area | Rate Center |
| Priority | Must Have |
| Description | System shall allow user to create, rename, and delete projects |
| Acceptance Criteria | Projects can be maintained and displayed with policy counts |

### FR-06 Sales Policy Management

| Item | Description |
|---|---|
| Requirement ID | FR-06 |
| Name | Manage Sales Policies |
| Business Area | Rate Center |
| Priority | Must Have |
| Description | System shall allow user to create, edit, and delete sales policies under each project |
| Acceptance Criteria | User can maintain policy basic info and see details by policy |

### FR-07 Rate Matrix Configuration

| Item | Description |
|---|---|
| Requirement ID | FR-07 |
| Name | Configure Rate Matrix |
| Business Area | Rate Center |
| Priority | Must Have |
| Description | System shall allow user to configure interest rate rows by applicable duration |
| Acceptance Criteria | User can add, edit, delete, and order buckets by `maxMonths` |

### FR-08 Interest Support Policy Configuration

| Item | Description |
|---|---|
| Requirement ID | FR-08 |
| Name | Configure Interest Support Policy |
| Business Area | Rate Center |
| Priority | Must Have |
| Description | System shall allow user to enable support interest once per sales policy and configure support duration, payer, and principal rule |
| Acceptance Criteria | User can enable/disable support and maintain all support metadata |

### FR-09 Fee Policy Configuration

| Item | Description |
|---|---|
| Requirement ID | FR-09 |
| Name | Configure TNTH Fee Policy |
| Business Area | Rate Center |
| Priority | Must Have |
| Description | System shall allow user to maintain TNTH fee phases at policy level |
| Acceptance Criteria | User can maintain fee per phase and system resolves current phase fee |

### FR-10 Mini Master for Support Policies

| Item | Description |
|---|---|
| Requirement ID | FR-10 |
| Name | Reusable Support Policy Mini Master |
| Business Area | Rate Center |
| Priority | Should Have |
| Description | System shall allow user to save current support setup as reusable source and apply it to another sales policy |
| Acceptance Criteria | User can save reusable support policy, select it, auto-fill policy-level fields, and delete it from source |

### FR-11 Mini Master for Fee Policies

| Item | Description |
|---|---|
| Requirement ID | FR-11 |
| Name | Reusable Fee Policy Mini Master |
| Business Area | Rate Center |
| Priority | Should Have |
| Description | System shall allow user to save current TNTH fee setup as reusable source and apply it to another sales policy |
| Acceptance Criteria | User can save reusable fee policy, select it, auto-fill fee rules, and delete it from source |

### FR-12 Grace Rule Configuration

| Item | Description |
|---|---|
| Requirement ID | FR-12 |
| Name | Configure Grace Rules |
| Business Area | Rate Center |
| Priority | Must Have |
| Description | System shall allow user to configure principal grace rules by policy, group, and exception |
| Acceptance Criteria | System derives grace period based on rules and priorities |

### FR-13 Rate Adjustment Rules

| Item | Description |
|---|---|
| Requirement ID | FR-13 |
| Name | Configure Rate Adjustment Rules |
| Business Area | Rate Center |
| Priority | Should Have |
| Description | System shall allow user to define conditional rate adjustments |
| Acceptance Criteria | Adjustment applies only when all conditions match input contract data |

### FR-14 Rule Engine

| Item | Description |
|---|---|
| Requirement ID | FR-14 |
| Name | Derive Runtime Policy Values |
| Business Area | Calculation |
| Priority | Must Have |
| Description | System shall derive policy fields used in templates and advisory |
| Acceptance Criteria | Derived values include rate, support period, payer, fee phase, grace, and rule notes |

### FR-15 Template Mapping with Rate Center

| Item | Description |
|---|---|
| Requirement ID | FR-15 |
| Name | Map Rate Center Fields into Templates |
| Business Area | Template Generation |
| Priority | Must Have |
| Description | System shall expose Rate Center and Rule Engine fields as mapping options |
| Acceptance Criteria | User can map placeholders to policy-derived fields and preview values |

### FR-16 Policy Advisory

| Item | Description |
|---|---|
| Requirement ID | FR-16 |
| Name | Rank Policies for User Input |
| Business Area | Advisory |
| Priority | Should Have |
| Description | System shall analyze available policies and return ranked candidate policies |
| Acceptance Criteria | System returns Top-5 policies with score, probability, and score breakdown |

## 14. LLM / AI Capability Positioning

### 14.1 Current-State Position

The current codebase does **not** contain:

- LLM API integration
- prompt orchestration
- embedding service
- model inference endpoint
- external AI provider dependency

Therefore, any BRD statement claiming that the current release already uses LLM to generate sales policies would be inaccurate.

### 14.2 Current Advisory Logic

The existing advisory engine is a browser-side mathematical ranking engine using:

- dynamic weights
- sigmoid scoring
- cosine similarity
- softmax normalization

This should be described in BRD as `Policy Advisory Engine`, not `LLM Module`.

### 14.2.1 Applied AI-Inspired Mathematical Techniques

Although the current release does not integrate a true Large Language Model, it does apply several mathematical techniques commonly associated with modern AI or ML-style scoring systems.

| Technique | Current Usage in Project | Business Meaning |
|---|---|---|
| Softmax | Converts raw candidate scores into relative confidence distribution across Top-5 policies | Helps differentiate near-equal policies and present relative recommendation strength |
| Cosine Similarity | Compares customer input vector with policy vector | Measures multidimensional closeness between customer profile and policy profile |
| Sigmoid Function | Smooths dimension scoring such as term fit and LTV fit | Avoids hard binary scoring and supports gradual decline in suitability |
| Dynamic Weights | Adjusts score weights based on input context such as LTV, term, and risk | Makes recommendation more context-sensitive than fixed linear scoring |

These techniques are already relevant to the current advisory capability and should be documented as part of the `current-state advisory model`.

### 14.2.2 Why They Were Not Previously Written as "LLM Functions"

They were not previously labeled as `LLM functions` for one important reason: in software governance and BRD language, terms such as `LLM capability`, `LLM integration`, or `GenAI feature` usually imply:

- model inference through an LLM runtime
- prompt-based generation
- natural language reasoning from a model
- external or embedded AI model architecture

The current codebase does not contain those components. It uses mathematical scoring methods inspired by AI/ML concepts, but not a deployed LLM. Therefore, the correct BRD wording should be:

- `Current Release`: AI-inspired advisory algorithms
- `Future Release`: true LLM-assisted sales policy design

### 14.2.3 Current Advisory Algorithm Detail for BRD

The current advisory module may be documented as follows:

1. Input customer and loan parameters.
2. Normalize policy and customer dimensions.
3. Compute dimension fitness using sigmoid-based scoring.
4. Compute context-sensitive weights using dynamic weighting rules.
5. Compare customer vector and policy vector using cosine similarity.
6. Blend weighted score and cosine score into a final score.
7. Apply softmax to Top-5 results for confidence distribution.

### 14.2.4 Recommended BRD Statement

Recommended wording for the BRD:

`The Policy Advisory Engine in the current release uses AI-inspired mathematical algorithms including sigmoid scoring, cosine similarity, dynamic weighting, and softmax normalization to rank policies. The solution does not yet include a true LLM or generative AI runtime.`

### 14.3 Recommended Future-State LLM Scope

If the business wants AI support for building sales policies, it should be defined as a future requirement:

| Requirement ID | FR-17 |
|---|---|
| Name | AI-Assisted Sales Policy Authoring |
| Business Area | Advisory / Product Design |
| Priority | Could Have |
| Description | System should assist business users in drafting new sales policies based on project profile, target customer segment, past policy patterns, and lending objectives |
| Proposed Input | Project type, segment, target NIM, target LTV, loan term, risk appetite, competitor assumptions |
| Proposed Output | Draft policy structure, suggested rate buckets, suggested support policy, suggested fee policy, rationale |
| Delivery Phase | Phase 2 / Future Scope |
| Dependency | Requires backend or model integration architecture |

### 14.4 Recommended BRD Treatment

The BRD should separate clearly:

- `Current Release`: browser-only rule engine and advisory ranking
- `Future Release`: optional LLM-assisted policy design

## 15. Data Requirements

| Data Group | Description |
|---|---|
| Template Data | Excel-like templates and Word templates |
| Source Data | Imported files and extracted fields |
| Master Data | Entity definitions and records |
| Rate Center Data | Projects, sales policies, rate buckets, grace rules, exceptions |
| Support Mini Master | Reusable support interest policies |
| Fee Mini Master | Reusable TNTH fee policies |
| Advisory Input | User-entered policy advisory parameters |

## 16. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | System shall run fully in browser for core workflows |
| NFR-02 | System shall not require external API key for current release |
| NFR-03 | User interactions for rule calculation and mapping should be responsive |
| NFR-04 | Data shall persist locally in browser storage between sessions |
| NFR-05 | UI shall be usable on standard desktop screen sizes |

## 17. Risks

| Risk ID | Risk | Mitigation Direction |
|---|---|---|
| R-01 | Local browser storage may be cleared | Add export/backup capability in future |
| R-02 | Shared mini master policy may be edited inconsistently | Introduce governance/versioning later |
| R-03 | No centralized audit trail | Future backend and approval workflow |
| R-04 | Users may assume advisory is AI-generated while it is rule/math-based | Document current logic clearly in product and BRD |

## 18. Acceptance Criteria

### Business Acceptance

- User can configure project and sales policy.
- User can configure interest rate matrix.
- User can configure support interest and TNTH fee policy at policy level.
- User can save reusable support/fee policies into mini master.
- User can select reusable support/fee policies from source.
- User can generate templates with policy-derived fields.
- User can receive Top-5 policy advisory results.

### Documentation Acceptance

- BRD distinguishes current delivered capability from future AI capability.
- BRD reflects actual code scope and system behavior.
- BRD is suitable for handoff to BA, Product, Dev, and UAT stakeholders.

## 19. UAT Scenarios

| UAT ID | Scenario | Expected Result |
|---|---|---|
| UAT-01 | Create new project and sales policy | Policy is saved and visible under project |
| UAT-02 | Configure rate matrix | Buckets saved and ordered correctly |
| UAT-03 | Enable support interest at policy level | Support fields available and derived correctly |
| UAT-04 | Save support policy into mini master | Reusable policy appears in source dropdown |
| UAT-05 | Apply reusable support policy to another sales policy | Relevant fields auto-filled |
| UAT-06 | Save fee policy into mini master | Reusable fee policy appears in source dropdown |
| UAT-07 | Apply reusable fee policy to another sales policy | Fee phases auto-filled |
| UAT-08 | Run rule engine with selected policy | Derived policy fields are returned correctly |
| UAT-09 | Map policy fields into template | Placeholder preview shows correct values |
| UAT-10 | Run advisory | Top-5 policies returned with scores |

## 20. Appendix

### Related Local Files

- [BRD.md](/Users/harryng/Desktop/Document/excel-template-app/BRD.md:1)
- [index.html](/Users/harryng/Desktop/Document/excel-template-app/index.html:959)
- [js/master-data.js](/Users/harryng/Desktop/Document/excel-template-app/js/master-data.js:42)
- [js/rate-center.js](/Users/harryng/Desktop/Document/excel-template-app/js/rate-center.js:364)
- [js/policy-advisor.js](/Users/harryng/Desktop/Document/excel-template-app/js/policy-advisor.js:5)
- [js/app.js](/Users/harryng/Desktop/Document/excel-template-app/js/app.js:2246)
- [js/word-template.js](/Users/harryng/Desktop/Document/excel-template-app/js/word-template.js:395)
