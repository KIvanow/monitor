---
title: FAQ
nav_order: 7
---

# Frequently Asked Questions

## General

### What's the difference between BetterDB and RedisInsight?

BetterDB is built for **Valkey-first** observability with historical persistence. Key differences:
- **Historical data**: BetterDB persists metrics, slowlogs, and audit trails for days/months
- **Valkey features**: First-class support for COMMANDLOG, SLOT-STATS, and other Valkey-specific features
- **Pattern analysis**: Aggregated slowlog patterns showing "GET user:* is 80% of slow queries"
- **Anomaly detection**: Automatic baseline detection and alerting

### Does BetterDB work with Redis?

Yes! BetterDB is fully compatible with Redis 6.0+. Valkey-specific features gracefully degrade when connected to Redis.

### Is BetterDB open source?

BetterDB follows an **open-core model**:
- Core monitoring features are MIT licensed
- Pro/Enterprise features (anomaly detection, extended retention, etc.) require a license
- See our [pricing page](https://betterdb.com/pricing) for details

## Technical

### How much overhead does BetterDB add?

BetterDB is designed for minimal overhead:
- Uses read-only commands (INFO, SLOWLOG, CLIENT LIST, etc.)
- Default poll interval: 1 second for metrics, 60 seconds for client snapshots
- Benchmarked at <0.5% CPU overhead on typical workloads
- Uses a dedicated connection (doesn't consume application pool)

### What data does BetterDB persist?

Depending on your tier and storage backend:
- Slowlog entries and patterns
- ACL audit trail events
- Client connection snapshots
- Anomaly detection events
- Key analytics snapshots (Pro+)

### Can I use BetterDB with a Redis/Valkey cluster?

Yes! BetterDB automatically detects cluster mode and:
- Discovers all nodes in the cluster
- Aggregates metrics across nodes
- Shows cluster topology and slot distribution
- Tracks slot migrations

### What ports does BetterDB need?

- **Outbound to Valkey/Redis**: Your configured DB_PORT (default 6379)
- **Outbound to PostgreSQL**: 5432 (if using postgres storage)
- **Inbound HTTP**: Your configured PORT (default 3001)
- **Outbound HTTPS**: For license validation (optional, with offline fallback)

## Deployment

### Can I run multiple BetterDB instances?

With a Pro or Enterprise license, you can monitor multiple databases:
- Community: 1 instance
- Pro: Up to 10 instances
- Enterprise: Unlimited

### Does BetterDB support high availability?

For the self-hosted version:
- BetterDB itself is stateless (state is in PostgreSQL)
- Run multiple instances behind a load balancer
- Each instance connects to the same PostgreSQL database

### How do I backup BetterDB data?

BetterDB stores all persistent data in your configured storage backend:
- **PostgreSQL**: Use standard pg_dump/pg_restore
- **Memory**: No persistence (data lost on restart)
- **SQLite** (dev only): Backup the .db file

## Troubleshooting

### See our [Troubleshooting Guide](troubleshooting) for common issues.
