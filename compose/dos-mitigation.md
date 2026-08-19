# RoboSats Coordinator — Onion Service DoS Mitigation Guide

This document describes the layered DoS defences configured in this repo and
explains how to operate them during an attack.

References:
- https://community.torproject.org/onion-services/advanced/dos/
- https://onionservices.torproject.org/technology/security/pow/

---

## Defence layers (applied in order)

```
Internet ──► Tor intro points ──► Tor rendezvous ──► nginx (port 81) ──► Gunicorn/Daphne
              [Layer 1]            [Layer 2]          [Layer 3]            [Layer 4]
```

### Layer 1 — Intro-point rate limiting (torrc)

Limits how many introduction requests reach *your machine* per second.
Applied at the Tor relay level so attackers pay bandwidth for each attempt.

```
HiddenServiceEnableIntroDoSDefense      1
HiddenServiceEnableIntroDoSRatePerSec   25   # sustained: 25 new clients/s
HiddenServiceEnableIntroDoSBurstPerSec  200  # burst: up to 200 within 1 s
```

Under light attack: tighten these values (e.g., rate=10, burst=50).
Under heavy attack: go as low as rate=2, burst=10.

### Layer 2 — Proof-of-Work rendezvous defense (torrc)

Clients must solve a CPU puzzle (Equi-X, LGPL) before a rendezvous circuit
is established.  Effort is **auto-tuned** by Tor — zero when idle, increases
under load — so legitimate users are unaffected until the service is stressed.

```
HiddenServicePoWDefensesEnabled 1
HiddenServicePoWQueueRate   250  # rendezvous requests dispatched/s
HiddenServicePoWQueueBurst  2500 # max burst from the priority queue
```

Lower `PoWQueueRate`/`PoWQueueBurst` → higher puzzle effort imposed on
clients (attackers pay more CPU; legitimate Tor Browser users get slightly
slower connections).

**Requirement:** tor ≥ 0.4.8.1 compiled with `--enable-gpl`.
Verify with:
```sh
tor --list-modules          # must show:  pow: yes
tor --version               # must mention: General Public License
```

The `compose/tor/Dockerfile` asserts both at build time and fails the build if
PoW is not available.

### Layer 3 — Stream limits + Circuit-ID export (torrc → nginx)

```
HiddenServiceMaxStreams           200   # max simultaneous streams per circuit
HiddenServiceMaxStreamsCloseCircuit 1   # tear down offending circuits
HiddenServiceExportCircuitID haproxy   # prepend PROXY-protocol header on port 81
```

`HiddenServiceExportCircuitID haproxy` makes Tor write a HAProxy PROXY
protocol header before each connection:

```
PROXY TCP6 fc00:dead:beef:4dad::0000:00AB ::1 65535 42
```

The last 32 bits of the first IPv6 address encode the **global circuit ID**.
Nginx reads this via `$proxy_protocol_addr` on port 81 and uses it as the
key for `limit_req` / `limit_conn` zones — giving true *per-circuit* rate
limiting instead of the useless `127.0.0.1` bucket.

**Port topology**

| Port | Listener | Traffic source |
|------|----------|----------------|
| 80   | clearnet vhost | public internet |
| 81   | onion vhost (`proxy_protocol`) | Tor process only (`127.0.0.1`) |

Nginx `torrc` entry:  `HiddenServicePort 80 127.0.0.1:81`

### Layer 4 — nginx rate limiting + caching

Defined in `compose/nginx/{tn,mn}.conf.d/local.conf`.

#### Rate-limit zones (onion vhost, port 81)

| Zone | Key | Rate | Used for |
|------|-----|------|----------|
| `onion_req` | circuit pseudo-IP | 10 r/s (tn) / 20 r/s (mn) | `/ `, cached API endpoints |
| `onion_ws` | circuit pseudo-IP | 5 r/s (tn) / 10 r/s (mn) | `/ws/`, `/relay`, `/nostr`, `/blossom/` |
| `onion_coord` | circuit pseudo-IP | 2 r/s | `/coordinator` |
| `onion_conn` | circuit pseudo-IP | (connection count) | all locations |

Excess requests get HTTP **429** (`limit_req_status 429`) so clients can
back off gracefully.  Abusive circuits are also killed by Layer 3.

#### Response caching (hot read endpoints)

`/api/info`, `/api/limits`, `/api/ticks`, `/api/book` are cached for **5 s**
with `proxy_cache_lock on`.  Under a flood only one upstream request fires per
cache miss; all other circuits get the cached response instantly.  This is the
single most effective measure against book/info floods.

#### Connection hygiene

All vhosts set:
- `client_body_timeout 10s`
- `client_header_timeout 10s`
- `send_timeout 30s`
- `reset_timedout_connection on`
- `proxy_read_timeout 3600s` (WebSocket connections)
- `return 444` for requests with an empty `User-Agent` header

---

## Monitoring PoW metrics

Enable `MetricsPort` in torrc (already in the sample configs):

```
MetricsPort 127.0.0.1:9035
MetricsPortPolicy accept 127.0.0.1
```

Read metrics:
```sh
curl -s http://127.0.0.1:9035/metrics | grep -E "tor_hs_pow|tor_hs_rdv"
```

Key gauges:

| Metric | Meaning |
|--------|---------|
| `tor_hs_pow_suggested_effort` | Current puzzle effort suggested to clients (0 = idle) |
| `tor_hs_rdv_pow_pqueue_count` | Rendezvous requests queued waiting for dispatch |

If `tor_hs_pow_suggested_effort` is climbing, the service is under attack and
PoW is actively filtering.  If `tor_hs_rdv_pow_pqueue_count` is growing, lower
`HiddenServicePoWQueueRate` to increase effort faster.

---

## Tuning cheat-sheet

| Symptom | Action |
|---------|--------|
| `tor_hs_pow_suggested_effort` rising but queue not draining | Lower `HiddenServicePoWQueueRate` (e.g., 50) |
| Introduction flood overwhelming the service | Lower `HiddenServiceEnableIntroDoSRatePerSec` (e.g., 10) and `...BurstPerSec` (e.g., 50) |
| Specific circuits hammering nginx (HTTP 429 in logs) | Tighten `onion_req` / `onion_ws` zone rates |
| Specific circuits survive rate limits (slow POST flood) | Lower `HiddenServiceMaxStreams` (e.g., 50) |
| Attack is distributed across many circuits (botnet) | Increase `HiddenServicePoWQueueRate` difficulty or temporarily reduce `HiddenServicePoWQueueBurst` |

---

## Killing a specific abusive circuit via ControlPort

`HiddenServiceExportCircuitID haproxy` encodes the circuit ID in nginx logs.
Read it from the `$proxy_protocol_addr` IPv6 address:

```
# IPv6: fc00:dead:beef:4dad::AABB:CCDD
# circuit_id = (0xAA << 24) | (0xBB << 16) | (0xCC << 8) | 0xDD

python3 -c "
addr = 'fc00:dead:beef:4dad::0000:00ab'
words = addr.split('::')[1].split(':')
hex_str = ''.join(w.zfill(4) for w in words)
print('circuit_id =', int(hex_str, 16))
"
```

Then kill it via the Tor control port:
```sh
# Inside the tor container:
echo -e 'AUTHENTICATE\r\nCLOSECIRCUIT <circuit_id>\r\nQUIT' \
  | nc 127.0.0.1 9051
```

---

## Private admin onions — Client Authorization

The admin panel, Thunderhub, LiT, and LNDg onion services do **not** use PoW
(they are private; PoW would burden legitimate admins with puzzle-solving).
Instead, restrict them with v3 client authorization:

```
# In torrc, per service:
HiddenServiceDir /var/lib/tor/robotest-admin/
HiddenServiceVersion 3
HiddenServiceAuthorizeClient stealth <alice>,<bob>
```

See: https://community.torproject.org/onion-services/advanced/client-auth/

---

## Horizontal scaling (Onionbalance)

If a single coordinator is overwhelmed despite all defences, Onionbalance
distributes requests across multiple backend instances behind one onion address:

```
onion address (published)
       │
  Onionbalance
   ┌───┴────┐
   │        │
backend1  backend2
```

See: https://onionservices.torproject.org/apps/base/onionbalance/

---

## What is NOT covered here

- **Django/DRF throttling** — backend-level throttle classes live in the
  `robosats` app repo (not this deploy repo).
- **Captchas** — suitable for extreme attacks; requires OpenResty + Lua or an
  external service.
- **I2P** — the I2P stack (`compose/i2p/`) has its own DoS surface; consult
  I2P documentation for equivalent mitigations.
