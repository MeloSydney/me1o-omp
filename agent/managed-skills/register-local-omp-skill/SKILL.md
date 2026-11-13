---
name: register-local-omp-skill
description: Register a local skill in omp without disturbing separate agent skill installations
---

Check the existing target with readlink and verify SKILL.md before linking. Keep ~/.omp/agent/skills and ~/.agents/skills distinct; do not overwrite an existing real directory. Create an absolute symlink for requested source, then verify readlink and SKILL.md.
