# Portable CallCraft skill

Copy the `callcraft/` directory into the skill directory supported by your IDE or
AI coding tool. Skill discovery locations differ between clients; this repository
does not install or alter any IDE configuration automatically.

The skill provides operating instructions, not an MCP connection or credential.
Configure the deployed MCP endpoint separately, then let the AI discover actual
server capabilities. Use HTTPS Streamable HTTP `/mcp/v1`, or the remote stdio
bridge documented in `.blueprint/specifications/mcp-http-tools.md`.

Required connection headers: `Authorization: Bearer <secret>`, `X-USER-ID`,
`X-CALL-PUBLIC-KEY`. Keep their values in the client secret store/environment.

The canonical architecture, API and deployment documentation remains in
`.blueprint/`; avoid copying those documents into individual project skills.
