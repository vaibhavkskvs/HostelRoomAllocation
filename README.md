# Hostel Room Allocation with Preferences

A complete, working full-stack web application for college hostel room reservation, built as a **B.Tech Data Structures and Algorithms (DSA) PBL project**.

---

## Project Overview

Students can explore two hostel blocks (AC and Non-AC), browse residential floors, view available rooms, set their preferences, receive AI-ranked recommendations powered by a **compiled C algorithm**, and reserve a room with their student details — all without payment.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS v4, React Router v6 |
| Backend | Node.js, Express.js |
| Database | SQLite (via `better-sqlite3`) |
| DSA Core | C (C99), compiled with GCC/MinGW |
| PDF Generation | jsPDF + html2canvas |

---

## Hostel Inventory

### Structure
- **2 blocks**: AC Block and Non-AC Block
- **7 floors per block**: Ground floor (Mess) + 6 residential floors
- **16 rooms per residential floor**:
  - 5 × 2-Seater (capacity 2)
  - 10 × 3-Seater (capacity 3)
  - 1 × 4-Seater (capacity 4)

### Calculated Totals
| Metric | Calculation | Result |
|--------|-------------|--------|
| Total residential floors | 2 × 6 | 12 |
| Total rooms | 2 × 6 × 16 | **192** |
| Beds per block | 6 × (5×2 + 10×3 + 1×4) = 6 × 44 | 264 |
| Total beds | 2 × 264 | **528** |

### Room ID Convention
- AC Block:  `AC-F##` where F = floor, ## = sequence (01–16)
- Non-AC Block: `NAC-F##`
- Examples: `AC-101` (Floor 1, Room 1), `NAC-316` (Floor 3, Room 16)

---

## Database Design (SQLite)

### `rooms` table
| Column | Type | Description |
|--------|------|-------------|
| room_id | TEXT PK | Unique room identifier |
| block | TEXT | 'AC' or 'NAC' |
| floor | INTEGER | 1–6 |
| room_type | TEXT | '2-Seater', '3-Seater', '4-Seater' |
| capacity | INTEGER | 2, 3, or 4 |
| status | TEXT | 'AVAILABLE' or 'RESERVED' |

### `students` table
| Column | Type | Description |
|--------|------|-------------|
| student_id | TEXT PK | UUID |
| full_name | TEXT | Student's full name |
| roll_number | TEXT UNIQUE | College roll number |
| email | TEXT | College email |
| mobile | TEXT | 10-digit mobile number |
| department | TEXT | Branch/department |
| academic_year | TEXT | e.g. '2nd Year' |

### `reservations` table
| Column | Type | Description |
|--------|------|-------------|
| reservation_id | TEXT PK | e.g. `RES-A1B2C3D4E5F6` |
| student_id | TEXT FK | References students |
| room_id | TEXT FK | References rooms |
| reserved_at | TEXT | ISO 8601 timestamp |
| status | TEXT | 'ACTIVE' or 'CANCELLED' |

**Constraints**:
- `UNIQUE(room_id, status)` — one active reservation per room
- `UNIQUE(student_id, status)` — one active reservation per student

---

## C Module — DSA Implementation

### Location
```
c-algorithms/
├── room_allocator.h    # Type definitions and API declarations
├── room_allocator.c    # Algorithm implementations + CLI interface
└── room_allocator.exe  # Compiled executable (Windows)
```

### Data Structures
- **`Room` struct**: Stores room_id, block, floor, room_type, capacity, status
- **`Preference` struct**: Stores student's preferences and priority ordering
- **`ScoredRoom` struct**: Pairs a Room with its recommendation score and reason string
- **Arrays of structs**: Primary data structure — contiguous, O(1) access, cache-friendly

### Algorithms

#### 1. Linear Filter — `filter_available_rooms()`
```
Complexity: O(n)
```
Single pass through all n rooms, copying only AVAILABLE rooms to an output buffer.

#### 2. Scoring Function — `score_room()`
```
Complexity: O(1) per room
```
Computes a 0–100 preference match score using weighted criteria:

| Criterion | Base Weight | Priority 1 | Priority 2 | Priority 3 |
|-----------|-------------|------------|------------|------------|
| Room Type | 40 pts | ×3 (120) | ×2 (80) | ×1 (40) |
| Block | 30 pts | ×3 (90) | ×2 (60) | ×1 (30) |
| Floor | 20 pts | ×3 (60) | ×2 (40) | ×1 (20) |
| Capacity bonus | 10 pts | — | — | — |

Score is normalized to 0–100 based on the maximum achievable score given the student's priorities.

#### 3. Insertion Sort — `insertion_sort_scored()`
```
Complexity: O(k²) worst case, O(k) best case
```
Sorts the array of k eligible rooms by score descending. Chosen because:
- k ≤ 192 — O(k²) is computationally negligible
- In-place, stable, simple, excellent for near-sorted data
- Easy to understand and defend in a viva

#### 4. Complete Pipeline — `recommend_rooms()`
```
Overall complexity: O(n + k²)
  Step 1: filter  → O(n)
  Step 2: score   → O(k)
  Step 3: sort    → O(k²)
  where k ≤ n = 192
```

### Node.js Integration
```
Student submits preferences
→ React sends POST /api/recommendations
→ Express fetches AVAILABLE rooms from SQLite
→ Backend spawns room_allocator.exe as child process
→ JSON piped to stdin  (no shell injection risk)
→ C: filter → score → sort → output JSON to stdout
→ Express parses stdout JSON
→ Backend cross-checks against current DB (race condition guard)
→ React renders ranked room cards with scores and reasons
```

---

## Installation & Setup

### Prerequisites
- Node.js ≥ 18
- npm ≥ 8
- GCC (MinGW on Windows) — for C compilation
- Python 3 (optional, for running test scripts)

### 1. Clone / Open Project
```bash
cd hostel-room-allocation
```

### 2. Compile the C Module
```bash
cd c-algorithms
gcc -std=c99 -Wall -O2 -o room_allocator.exe room_allocator.c
cd ..
```

### 3. Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 4. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 5. Start the Backend
```bash
cd backend
npm start
```
The server starts on **http://localhost:5000**. On first run, it automatically creates the SQLite database and generates all 192 rooms.

### 6. Start the Frontend (separate terminal)
```bash
cd frontend
npm run dev
```
The app opens on **http://localhost:5173**.

---

## Verification Tests

Run the API integration tests (backend must be running):
```bash
python test_api.py
```

This verifies:
1. ✓ 192 rooms initialized
2. ✓ All 12 floors have 16 rooms each
3. ✓ C algorithm returns correctly ranked recommendations
4. ✓ Reservation creates and locks room atomically
5. ✓ Stats update after reservation
6. ✓ Duplicate room reservation rejected (409)
7. ✓ Duplicate student reservation rejected (409)
8. ✓ Reservation lookup by ID + roll number
9. ✓ Reserved rooms excluded from recommendations

---

## Student Booking Workflow

1. Visit **http://localhost:5173**
2. Homepage shows live room statistics (192 available, 0 reserved initially)
3. Click **AC Block** or **Non-AC Block**
4. Navigate residential floors 1–6 in the sidebar
5. See available rooms grouped by type on each floor
6. Alternatively, go to **Recommendations** and set your preferences:
   - Preferred block, room type, floor
   - Priority ordering for each criterion
   - The C algorithm ranks available rooms by your preferences
7. Click **Reserve This Room** on any available room card
8. Fill in student details (name, roll number, email, mobile, department, year)
9. Review details on the confirmation screen
10. Click **Confirm Reservation** — room is atomically locked in the database
11. Receive Reservation ID and download PDF confirmation
12. Look up your booking anytime at **My Booking** using your Reservation ID + Roll Number

---

## Critical Design Decisions

### Atomic Reservation
SQLite transactions ensure two simultaneous reservation attempts for the same room cannot both succeed. The `UNIQUE(room_id, status)` constraint acts as a final database-level guard even if the application-level transaction fails.

### C as Live Integration
The C module is a working executable called by Node.js for every recommendation request. It is not a demonstration file — it processes real room data from the database on every API call.

### No Admin Interface
Room inventory is generated automatically. Students interact directly with available inventory. No admin, no payments, no management features.

### Persistence
SQLite stores all data on disk. Restarting the backend never resets reservations. The initialization check (`SELECT COUNT(*) FROM rooms`) prevents duplicate room generation.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/rooms/stats` | Aggregate availability statistics |
| GET | `/api/rooms` | All rooms (with optional filters: block, floor, type, status) |
| GET | `/api/rooms/block/:block` | Rooms in AC or NAC block |
| GET | `/api/rooms/floor/:block/:floor` | Rooms on a specific floor |
| GET | `/api/rooms/:roomId` | Single room details |
| POST | `/api/reservations` | Create a reservation (atomic) |
| GET | `/api/reservations/lookup` | Look up by reservation_id + roll_number |
| GET | `/api/reservations/:id` | Reservation details by ID |
| POST | `/api/recommendations` | Preference-based recommendations via C algorithm |

---

## DSA Viva Points

**Q: Why use a struct array instead of a linked list?**
A: For 192 rooms, an array gives O(1) random access, better cache locality during linear scan, and simpler code. Linked lists would add pointer overhead with no benefit at this scale.

**Q: Why insertion sort instead of quicksort or mergesort?**
A: For k ≤ 192 elements, insertion sort is often faster in practice due to low overhead and cache-friendly memory access. Its O(k²) worst case is entirely negligible here.

**Q: What is the overall time complexity of the recommendation?**
A: O(n + k²) — O(n) for the linear filter, O(k) for scoring, O(k²) for sorting — where n = 192 and k ≤ n.

**Q: How does the C module connect to Node.js?**
A: The Node.js backend spawns the compiled C executable as a child process, writes JSON to its stdin, and reads JSON from its stdout. This avoids any shell injection risk because data is piped, not interpolated.

**Q: How are concurrent reservations prevented?**
A: Three layers of protection:
1. SQLite `UNIQUE(room_id, status)` constraint — database-level
2. SQLite transaction with room status check before INSERT — application-level
3. Express serializes requests to the same room within a single process

---

*Project by: [Your Name] | B.Tech DSA PBL | Academic Year 2025-26*
