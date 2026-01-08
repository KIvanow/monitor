# BetterDB Monitor

A monorepo application for monitoring Valkey/Redis databases with a NestJS backend and React frontend.

## Project Structure

```
betterdb-monitor/
├── apps/
│   ├── api/                 # NestJS backend (Fastify)
│   └── web/                 # React frontend (Vite)
├── packages/
│   └── shared/              # Shared TypeScript types
├── docker-compose.yml       # Local Valkey and Redis for testing on 6380 and 6381 respectively
└── package.json             # Workspace root
```

## Tech Stack

### Backend
- **NestJS** with Fastify adapter
- **iovalkey** for Valkey/Redis connections
- TypeScript with strict mode
- Runs on port **3001**

### Frontend
- **React** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **Recharts** for data visualization
- Runs on port **5173**

### Monorepo
- **pnpm workspaces** for dependency management
- **Turborepo** for build orchestration

## Quick Start

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker (for local Valkey instance)

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start local Valkey instance:
```bash
pnpm docker:up
```

4. Start development servers:
```bash
pnpm dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Individual Commands

Run only the API:
```bash
pnpm dev:api
```

Run only the web frontend:
```bash
pnpm dev:web
```

Stop Docker containers:
```bash
pnpm docker:down
```

Build for production:
```bash
pnpm build
```

## Features

### Current Features
- Database connection health monitoring
- Auto-detection of Valkey vs Redis
- Version detection
- Capability detection (Command Log, Slot Stats)
- Auto-refresh every 5 seconds

### Architecture Highlights

**Port/Adapter Pattern**: The backend uses a port interface (`DatabasePort`) with separate adapters for Valkey and Redis, making it easy to extend support for other databases.

**Auto-detection**: The application automatically detects whether it's connecting to Valkey or Redis by inspecting the `INFO` response.

**Capability Detection**: Features like Command Log (Valkey 8.1+) and Slot Stats (Valkey 8.0+) are automatically detected based on database version.

## Prometheus Metrics

Metrics are exposed at `GET /prometheus/metrics` in Prometheus text format.

### ACL Audit Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `betterdb_acl_denied` | gauge | - | Total ACL denied events captured |
| `betterdb_acl_denied_by_reason` | gauge | `reason` | ACL denied events by reason |
| `betterdb_acl_denied_by_user` | gauge | `username` | ACL denied events by username |

### Client Connection Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `betterdb_client_connections_current` | gauge | - | Current number of client connections |
| `betterdb_client_connections_peak` | gauge | - | Peak connections in retention period |
| `betterdb_client_connections_by_name` | gauge | `client_name` | Current connections by client name |
| `betterdb_client_connections_by_user` | gauge | `user` | Current connections by ACL user |

### Slowlog Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `betterdb_slowlog_pattern_count` | gauge | `pattern` | Number of slow queries per pattern |
| `betterdb_slowlog_pattern_avg_duration_us` | gauge | `pattern` | Average duration in microseconds per pattern |
| `betterdb_slowlog_pattern_percentage` | gauge | `pattern` | Percentage of slow queries per pattern |

### COMMANDLOG Metrics (Valkey 8.1+)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `betterdb_commandlog_large_request` | gauge | - | Total large request entries |
| `betterdb_commandlog_large_reply` | gauge | - | Total large reply entries |
| `betterdb_commandlog_large_request_by_pattern` | gauge | `pattern` | Large request count by command pattern |
| `betterdb_commandlog_large_reply_by_pattern` | gauge | `pattern` | Large reply count by command pattern |

### Node.js Process Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `betterdb_process_cpu_user_seconds_total` | counter | - | Total user CPU time spent in seconds |
| `betterdb_process_cpu_system_seconds_total` | counter | - | Total system CPU time spent in seconds |
| `betterdb_process_cpu_seconds_total` | counter | - | Total user and system CPU time spent in seconds |
| `betterdb_process_start_time_seconds` | gauge | - | Start time of the process since unix epoch in seconds |
| `betterdb_process_resident_memory_bytes` | gauge | - | Resident memory size in bytes |
| `betterdb_process_virtual_memory_bytes` | gauge | - | Virtual memory size in bytes |
| `betterdb_process_heap_bytes` | gauge | - | Process heap size in bytes |
| `betterdb_process_open_fds` | gauge | - | Number of open file descriptors |
| `betterdb_process_max_fds` | gauge | - | Maximum number of open file descriptors |

### Node.js Event Loop Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `betterdb_nodejs_eventloop_lag_seconds` | gauge | - | Lag of event loop in seconds |
| `betterdb_nodejs_eventloop_lag_min_seconds` | gauge | - | Minimum recorded event loop delay |
| `betterdb_nodejs_eventloop_lag_max_seconds` | gauge | - | Maximum recorded event loop delay |
| `betterdb_nodejs_eventloop_lag_mean_seconds` | gauge | - | Mean of recorded event loop delays |
| `betterdb_nodejs_eventloop_lag_stddev_seconds` | gauge | - | Standard deviation of recorded event loop delays |
| `betterdb_nodejs_eventloop_lag_p50_seconds` | gauge | - | 50th percentile of recorded event loop delays |
| `betterdb_nodejs_eventloop_lag_p90_seconds` | gauge | - | 90th percentile of recorded event loop delays |
| `betterdb_nodejs_eventloop_lag_p99_seconds` | gauge | - | 99th percentile of recorded event loop delays |

### Node.js Runtime Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `betterdb_nodejs_active_resources` | gauge | `type` | Active resources keeping the event loop alive |
| `betterdb_nodejs_active_resources_total` | gauge | - | Total number of active resources |
| `betterdb_nodejs_active_handles` | gauge | `type` | Active libuv handles by type |
| `betterdb_nodejs_active_handles_total` | gauge | - | Total number of active handles |
| `betterdb_nodejs_active_requests` | gauge | `type` | Active libuv requests by type |
| `betterdb_nodejs_active_requests_total` | gauge | - | Total number of active requests |
| `betterdb_nodejs_version_info` | gauge | `version`, `major`, `minor`, `patch` | Node.js version info |

### Node.js Heap Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `betterdb_nodejs_heap_size_total_bytes` | gauge | - | Process heap size from Node.js in bytes |
| `betterdb_nodejs_heap_size_used_bytes` | gauge | - | Process heap size used from Node.js in bytes |
| `betterdb_nodejs_external_memory_bytes` | gauge | - | Node.js external memory size in bytes |
| `betterdb_nodejs_heap_space_size_total_bytes` | gauge | `space` | Process heap space size total in bytes |
| `betterdb_nodejs_heap_space_size_used_bytes` | gauge | `space` | Process heap space size used in bytes |
| `betterdb_nodejs_heap_space_size_available_bytes` | gauge | `space` | Process heap space size available in bytes |

### Node.js GC Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `betterdb_nodejs_gc_duration_seconds` | histogram | `kind` | Garbage collection duration (major, minor, incremental, weakcb) |

## Configuration

Edit `.env` to configure database connection:

```env
DB_HOST=localhost
DB_PORT=6379
DB_USERNAME=default
DB_PASSWORD=devpassword
DB_TYPE=auto  # 'valkey' | 'redis' | 'auto'
```

## Development

### Adding New Features

The codebase is structured to make it easy to add new monitoring features:

1. Add new endpoints in `apps/api/src/`
2. Add corresponding API calls in `apps/web/src/api/`
3. Add shared types in `packages/shared/src/types/`

### Code Style

- TypeScript strict mode is enabled
- Explicit return types required on functions
- No `any` types allowed
- ESLint + Prettier configured

## License

MIT
