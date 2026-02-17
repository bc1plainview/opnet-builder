<!--
    This document is derived from Bitcoin's BIP-1 (public-domain) and BIP-2
    (public-domain) texts.  See links in the "History" section.
-->

# OP_NET Improvement Proposals (OIPs)

Having an OIP in this repository **does not** make it an accepted
standard; that requires the status "Final" (or "Active" for perpetual
Process OIPs).

Those proposing changes should remember:

* The conservative / status-quo option is preferred when controversy is
  long-lived or consensus is unclear.
* Editors judge *format* and *process*, not technical merit.

---

## What is an OIP?

An **OIP** is a design document providing information to the OPNET
community, or describing a new feature for OPNET or its processes or
environment. It should contain a concise technical specification and a
clear rationale.

Because OIPs live as version-controlled text files, their git history
becomes the permanent historical record of OPNET's evolution.

---

## OIP Types

* **Standards Track** - changes that affect most or all implementations:
  consensus rules, networking, peer services, APIs.
* **Informational** - design notes or background; non-binding.
* **Process** - proposes a change to OPNET governance, tooling or this
  very process; meta-OIPs belong here.

(The taxonomy, wording, and intent are copied from the BIP
process.)

---

## Status Field

```

Draft -> Proposed -> Final
│         │
│         └──────────> Replaced / Obsolete
│
├───> Deferred
├───> Withdrawn
└───> Rejected

```

* **Draft** - incomplete but gives the community something to examine.
* **Proposed** - ready for intensive review; has a working reference
  implementation (where applicable) and a plan to reach Final.
* **Final** - normative and widely adopted.
* **Active** - perpetual Process OIPs.
* **Deferred / Withdrawn / Rejected / Replaced** follow BIP-2's exact
  semantics.

---

## The OIP Workflow

1. **Drafting**  
   *Fork* `opnet/OIPs`, create `OIP-<short-title>` branch, copy
   `OIP-template.md`, write in the mandated format (see below).

2. **Pull Request**  
   Open a PR labelled **"Draft OIP"**. Editors perform a
   _format-only_ pass and assign the next free number.

3. **Proposed**  
   After discussion stabilises and a reference implementation exists for
   Standards Track proposals set status to `Proposed`.

4. **Final**  
   Editors flip the status when objective adoption criteria are met
   (e.g., majority miner signalling for fork logic, ≥2 independent
   clients for APIs, etc.). Criteria intentionally mirror BIP-2.

---

## What belongs in a successful OIP?

* **Preamble** - RFC-822 style header (see next section).
* **Abstract** - ≈200 words.
* **Motivation** - why the existing protocol is inadequate.
* **Summary** - brief overview of the proposal, including any non-normative changes.
* **Specification** - normative details; compatible implementations must
  be possible.
* **Rationale** - design trade-offs and alternative paths considered.
* **Backwards Compatibility**
* **Reference Implementation** (mandatory before `Final`).
* **Copyright / License** - strongly prefer Apache-2.0 or CC0.

These headings originate verbatim from BIP-1.

---

## Header Preamble (template)

```

OIP: <to be assigned>
Title: \<max 44 chars>
Author: Alice Smith [alice@opnet.org](mailto:alice@opnet.org)
Discussions-To: [https://forum.opnet.org/t/OIP-0000](https://forum.opnet.org/t/OIP-0000)
Status: Draft
Type: Standards Track
Created: 2025-06-13
Post-History: 2025-06-20, 2025-07-01
Requires: 17
Superseded-By:
License: Apache-2.0

```

Write each field on its own line; continuation lines follow RFC 2822
rules (indent with one space).

---

## Format & Style Rules

* **File name:** `OIPs/OIP-####.md` where `####` is zero-padded.
* **Encoding:** plain UTF-8, but restrict to 7-bit ASCII unless there is
  a technical reason (same as BIPs).
* **Width:** keep lines ≤ 80 chars when prose permits.
* **Markup:** Markdown or MediaWiki only.

---

## Auxiliary Files

Images, test vectors, and diagrams live in
`assets/OIP-####/OIP-####-1.png` etc., matching the numbering scheme
from BIP-1/BIP-2.

---

## Transferring Ownership

If an author disappears or loses interest, mail both the original author
_and_ the editors requesting a takeover. After "reasonable time"
(≈ 1 month) editors may re-assign the OIP. Exact wording lifted from
Bitcoin's guidelines.

---

## OIP Editors

* **TBA** - (handle: `@ed1`)
* **TBA** - (handle: `@ed2`)

Send all OIP-related email to `OIP-editors@opnet.org`.  
Editors **only**:

* allocate numbers;
* ensure formatting conformance;
* merge/close PRs.

They do **not** judge technical merit-consensus is community-driven.

---

## History

This document is adapted from:

* **BIP-1 – _BIP Purpose and Guidelines_** (public domain)
* **BIP-2 – _BIP Process, revised_** (public domain)

---

© 2025 the respective authors; text released under the Creative Commons CC0 public-domain dedication unless stated
otherwise.
