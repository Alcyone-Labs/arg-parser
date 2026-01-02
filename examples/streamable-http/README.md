# Streamable HTTP Examples

- `secure-mcp.ts`: CORS + JWT (HS256) + /health
- `bearer-mcp.ts`: CORS + Bearer allowlist + /health

Run with your preferred runtime, for example:

```bash
export MY_JWT_SECRET=change_me
bun examples/streamable-http/secure-mcp.ts --s-mcp-serve
bun examples/streamable-http/bearer-mcp.ts --s-mcp-serve
```
