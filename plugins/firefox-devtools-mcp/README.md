# Firefox DevTools MCP

Control Firefox for browsing, web testing and debugging from Claude Code and Cowork. This plugin runs the [Mozilla Firefox DevTools MCP server](https://github.com/mozilla/firefox-devtools-mcp) locally with the developer tool preset. Requires Node.js 20.19 or newer and Firefox installed on your computer. The local MCP server is not available on claude.ai.

## Privacy policy

The MCP server runs on your computer. Depending on the tools you request, it reads page content, form fields, console messages, network activity and screenshots. These can contain personal data, cookies or other sensitive information available to the browser. Tool results are returned to your MCP client, such as Claude, and processed under that client provider's policies. Browser navigation and form submissions communicate with the sites you use.

Firefox profiles, downloads, saved screenshots and exported tool output can persist locally until you delete them. This plugin does not impose a fixed retention period on local files. Use a dedicated automation profile and avoid exposing information you do not want the MCP client to process.

The plugin launches a package from npm and dependencies may obtain browser-driver components. It does not configure a hosted browser service or an additional collection endpoint. See the [security documentation](https://github.com/mozilla/firefox-devtools-mcp/blob/main/SECURITY.md) for server capabilities and precautions.

For questions about this software and its data handling, use the project contact channels in [CONTRIBUTING.md](https://github.com/mozilla/firefox-devtools-mcp/blob/main/CONTRIBUTING.md). Do not include private browser content or credentials in public reports.

[Privacy policy](https://github.com/mozilla/firefox-devtools-mcp/blob/codex/claude-directory-plugin/plugins/firefox-devtools-mcp/README.md#privacy-policy)
