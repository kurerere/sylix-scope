# SylixScope Context

SylixScope is a desktop observability cockpit and telemetric platform for SylixOS real-time embedded systems, providing real-time resource monitoring, historical metric recording, and AI-assisted diagnostics.

## Language

**Target Board**:
The remote embedded hardware device running the SylixOS real-time operating system.
_Avoid_: Device, machine, host, server

**Telemetry Snapshot**:
An instantaneous collection of CPU core usages, memory distribution (total, used, free, kernel, app), and active processes sampled from the target board.
_Avoid_: Status, metric dump, stats

**Monitor Engine**:
The asynchronous background background task polling system metrics and process lists from the target board over Telnet.
_Avoid_: Poller, collector, fetcher

**Recording Session**:
A persistent, time-indexed time-series collection of system metrics and process tables stored in the local SQLite database.
_Avoid_: History log, trace, dump

**MCP Server**:
The embedded HTTP service implementing the Model Context Protocol (MCP) using Server-Sent Events (SSE) to expose monitoring tools and resources to external AI clients.
_Avoid_: API server, REST backend, bot interface

**SSE Session**:
An active, stateful Server-Sent Events connection established by an external AI client to exchange JSON-RPC protocol messages.
_Avoid_: Web socket, stream connection

**Command Session**:
An isolated, on-demand asynchronous Telnet communication channel used exclusively for executing SylixOS terminal commands without interrupting telemetric monitoring loops.
_Avoid_: Telnet tunnel, shell worker

**Telemetry Session**:
The active frontend telemetric streaming and buffer interpolation pipeline managing realtime sampling, process diffing, and timeline playback for the target board.
_Avoid_: Poller store, metric state, monitor context

**Audit Log**:
A time-stamped record of an MCP tool invocation including caller ID, tool parameters, execution latency, and success status.
_Avoid_: Access log, history event

**App Data Directory**:
The dedicated local directory automatically assigned per OS specification (macOS, Windows, Linux) where internal application state, SQLite recording databases (`history.db`), and configuration keys are persisted.
_Avoid_: Temp folder, cache dir, export folder

**Export Directory**:
A user-chosen external filesystem location where exported recording JSON files or snapshots are saved on-demand via file picker dialogs.
_Avoid_: App data path, system storage

**Network Interface**:
A physical or logical network adapter configured on the target board (e.g., `en1`, `en2`, `lo0`) reporting MTU, transmission counters, and interface status flags.
_Avoid_: Net card, NIC, adapter device

**Network Socket**:
An active endpoint on the target board classified by protocol (TCP, UDP, UNIX, PACKET) handling network or inter-process communication.
_Avoid_: Net connection, port listener, raw handle

**Socket State**:
The formal lifecycle condition of a network or UNIX domain socket (e.g., `LISTEN`, `ESTABLISHED`, `TIME_WAIT`, `CLOSE_WAIT`).
_Avoid_: Port status, socket phase

**Route Entry**:
A network routing forwarding rule specifying destination network, gateway, netmask, metric, and binding interface on the target board.
_Avoid_: IP route, route record

**Network Diagnostics Session**:
An on-demand or periodic diagnostic task executed over an isolated Command Session to inspect network interfaces, active sockets, routes, and statistics on the target board.
_Avoid_: Net poller, socket fetcher
