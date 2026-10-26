# C Algorithms — DSA Module

## Overview

This directory contains the core Data Structures and Algorithms implementation for the **Hostel Room Allocation with Preferences** project, written in C (C99).

## Files

| File | Purpose |
|------|---------|
| `room_allocator.h` | Type definitions and function declarations |
| `room_allocator.c` | Algorithm implementations + CLI entry point |
| `room_allocator.exe` | Compiled executable (Windows, MinGW GCC) |

## Data Structures Used

### `Room` struct
```c
typedef struct {
    char room_id[16];    // e.g. "AC-203"
    char block[8];       // "AC" or "NAC"
    int  floor;          // 1-6
    char room_type[16];  // "2-Seater", "3-Seater", "4-Seater"
    int  capacity;       // 2, 3, or 4
    char status[16];     // "AVAILABLE" or "RESERVED"
} Room;
```

An **array of `Room` structs** is used as the primary data structure. This gives:
- O(1) indexed access
- Cache-friendly linear traversal
- No dynamic allocation needed (fixed max of 192 rooms)

### `Preference` struct
```c
typedef struct {
    char preferred_block[8];
    char preferred_room_type[16];
    int  preferred_floor;
    int  priority_block;       // 1 = highest
    int  priority_room_type;
    int  priority_floor;
} Preference;
```

### `ScoredRoom` struct
Pairs a `Room` with its computed preference score and human-readable reason.

## Algorithms

### 1. Linear Filter — `filter_available_rooms()`
- **Purpose**: Remove all RESERVED rooms from consideration
- **Complexity**: O(n), where n = total rooms (at most 192)
- **Method**: Single pass through the array, copying AVAILABLE rooms to an output buffer

### 2. Scoring Function — `score_room()`
- **Purpose**: Assign a 0–100 preference match score to one room
- **Complexity**: O(1) per room
- **Scoring weights** (before priority multipliers):
  - Block match: 30 pts
  - Room type match: 40 pts
  - Floor match: 20 pts
  - Capacity bonus: 10 pts
- Priority 1 → multiplier ×3, Priority 2 → ×2, Priority 3 → ×1
- Raw score is normalized to 0–100

### 3. Insertion Sort — `insertion_sort_scored()`
- **Purpose**: Sort eligible rooms by score (highest first)
- **Complexity**: O(k²) worst case, O(k) when nearly sorted
- **Why insertion sort?**
  - k ≤ 192 (tiny dataset) — O(k²) is negligible
  - Simple, in-place, stable, cache-friendly
  - Easy to understand and defend in a viva

### 4. Main Pipeline — `recommend_rooms()`
- Combines filter + score + sort
- **Overall complexity**: O(n + k²)
  - O(n) for filtering
  - O(k) for scoring eligible rooms
  - O(k²) for sorting
  - Where k ≤ n = 192

## Integration with Node.js

The C module compiles to a standalone CLI executable. The Node.js backend:

1. Fetches available rooms from SQLite
2. Spawns `room_allocator.exe` as a child process
3. Writes JSON input to its **stdin**
4. Reads JSON output from its **stdout**
5. Returns the ranked recommendations to the frontend

**No shell injection risk** — user data is piped as JSON, never interpolated into a shell command string.

## Compilation

```bash
# From the c-algorithms directory:
gcc -std=c99 -Wall -O2 -o room_allocator.exe room_allocator.c
```

## Testing the C module manually

```bash
echo '{"preferences":{"preferred_block":"AC","preferred_room_type":"2-Seater","preferred_floor":3,"priority_block":2,"priority_room_type":1,"priority_floor":3},"rooms":[{"room_id":"AC-301","block":"AC","floor":3,"room_type":"2-Seater","capacity":2,"status":"AVAILABLE"},{"room_id":"AC-302","block":"AC","floor":3,"room_type":"3-Seater","capacity":3,"status":"AVAILABLE"},{"room_id":"NAC-101","block":"NAC","floor":1,"room_type":"2-Seater","capacity":2,"status":"AVAILABLE"}]}' | room_allocator.exe
```

Expected: AC-301 ranked first (matches block + type + floor), AC-302 second, NAC-101 third.
