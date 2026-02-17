# OPNet Builder — Setup

## Quick Install (AI-Assisted)

Paste this into your AI coding assistant:

> Install the OPNet Builder persona from personas.sh. It provides complete documentation, templates, and guidelines for building smart contracts, dApps, and plugins on Bitcoin Layer 1 using the OP_NET consensus protocol.

---

## Manual Installation

### Claude Code

1. Clone or download the `opnet-builder` package
2. Copy contents into your project's `.claude/` directory:

```bash
# From your project root
mkdir -p .claude/commands .claude/skills .claude/memory

# Copy persona identity
cp opnet-builder/PERSONA.md .claude/PERSONA.md

# Copy skill + all docs/guidelines/templates
cp -r opnet-builder/skills/* .claude/skills/

# Copy slash commands
cp opnet-builder/commands/*.md .claude/commands/

# Copy memory templates
cp opnet-builder/memory/*.md .claude/memory/
```

3. Add to your project's `CLAUDE.md`:

```markdown
## OPNet Builder
Read `.claude/PERSONA.md` for identity and behavioral rules.
Read `.claude/skills/SKILL.md` for the master development orchestrator.
```

### Cursor

1. Clone or download the `opnet-builder` package
2. Copy into your project's `.cursor/` directory:

```bash
mkdir -p .cursor/rules .cursor/skills

# Copy persona as a rule
cp opnet-builder/PERSONA.md .cursor/rules/opnet-builder.md

# Copy skill + docs
cp -r opnet-builder/skills/* .cursor/skills/
```

3. Cursor will automatically pick up rules from `.cursor/rules/`

### Windsurf

1. Clone or download the `opnet-builder` package
2. Copy into your project's `.windsurf/` directory:

```bash
mkdir -p .windsurf/rules .windsurf/skills

# Copy persona as a rule
cp opnet-builder/PERSONA.md .windsurf/rules/opnet-builder.md

# Copy skill + docs
cp -r opnet-builder/skills/* .windsurf/skills/
```

3. Windsurf will automatically pick up rules from `.windsurf/rules/`

---

## Using Blueprints

Blueprints provide pre-configured project scaffolds:

### OP20 Token Blueprint

```bash
# From opnet-builder directory
cat blueprints/op20-token/setup.md
```

Follow the setup instructions to scaffold a complete OP20 token project with contract, tests, and frontend.

### OP721 NFT Blueprint

```bash
cat blueprints/op721-nft/setup.md
```

Follow the setup instructions to scaffold a complete OP721 NFT project.

---

## Verifying Installation

After installing, ask your AI assistant:

> What are the mandatory reading docs for building an OP20 token contract?

It should list the specific docs in order from `skills/SKILL.md`. If it doesn't know, the skill files weren't loaded correctly.

---

## Requirements

| Tool | Minimum Version |
|------|-----------------|
| Node.js | >= 24.0.0 |
| TypeScript | >= 5.9.3 |
| npm | >= 10.0.0 |
