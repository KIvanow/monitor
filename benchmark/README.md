# BetterDB Benchmarks

Measures BetterDB's monitoring overhead on Valkey using interleaved randomized pairs to eliminate warm-up bias.

## Setup

```bash
cd valkey-perf-benchmark
python3 -m venv venv && venv/bin/pip install -r requirements.txt
cd ..

./preflight-interleaved.sh
```

## Usage

```bash
# Quick (~5 min)
python3 interleaved_benchmark.py --runs 5 --config configs/betterdb-quick.json

# Full (~15 min)
python3 interleaved_benchmark.py --runs 10 --config configs/betterdb-full.json
```

## Configs

- `betterdb-quick.json` - SET/GET, 64-256 bytes, pipeline 1/16
- `betterdb-full.json` - SET/GET/HSET/LPUSH, 64-1024 bytes, pipeline 1/10/50

## Reading Results

- Overhead <1%: noise
- Overhead 1-5%: acceptable
- Overhead >5%: investigate
- CV >15%: increase runs or check system stability

## Optional: System Tuning

```bash
sudo ./system_prep.sh
```

Disables turbo boost, sets performance governor. Resets on reboot.
