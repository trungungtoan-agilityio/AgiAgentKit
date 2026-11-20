# Source

Vendored third-party skill — do not edit here; refresh it from upstream instead.

- Upstream: https://github.com/bestagentkits/ak-render (skill `skills/ak-render`), tag `v0.3.0`
  (commit 46f70c8baab73b2b8112be68b357dac1487642ef)
- License: MIT — see LICENSE (copied from the upstream repo at the same tag)
- Added to AgiAgentKit on 2026-11-20.

## Version pin

The skill text matches npm `@bestagentkits/render@0.3.0` (83 blocks, ten theme presets).
Upstream `main` already documents unreleased commands (`compose`, `patch`, motion recipes, the
3D widgets) that 0.3.0 does not have, so refresh this copy only from a released tag, together
with the npm version. The skill calls `npx -y @bestagentkits/render` without a version; to stay
on the vendored contract, run `npx -y @bestagentkits/render@0.3.0` (or install that version) and
check `--version` first, as the skill says.

The hosted endpoint `https://render.agentkit.best/mcp` signs in with an AgentKit account (OAuth
or API key) and is meant for AgentKit customers. The CLI and the local `mcp` command need no
account; compiling and the compiled page make no network request (`npx` fetches the package once).
