# PRODUCT.md

## What it is
SylixScope — a Tauri 2 + React 19 desktop monitoring tool for SylixOS boards. Connects over Telnet, streams CPU/memory/process/network telemetry, records sessions, and exposes an MCP server (port 3001) so AI tools can read board metrics and run shell commands.

## Users & scene
Embedded engineers watching a live board. High-density Operate surface: glanceable metrics, tables of processes/interfaces/sockets, history of recordings, connection + threshold settings. Long-running observation, not reading.

## Surfaces
- Monitor view: CPU cores, memory distribution, connection status, resource chart, process table.
- Network view: tabbed panels — interfaces, sockets, routes, protocol stats, raw stats.
- History view: recordings list with play/delete, search.
- Settings view: board connection form, MCP service toggles, warning thresholds.
- Chrome: left nav rail, top title bar with connection control + MCP status, floating recording panel, connection config modal, MCP control drawer.

## Constraints
- Desktop-only Tauri window; macOS needs traffic-light clearance (isMac padding on title area, data-tauri-drag-region).
- Live-updating numbers — tabular figures, no layout shift.
- Dark/light themes via `.dark` class.
- Chinese UI copy.
- Current look: GitHub-Primer-style palette, 2px radii — replaced by DESIGN.md (Devin Desktop "Modular Cockpit"), locked by the user.
