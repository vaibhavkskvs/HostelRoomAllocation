/*
 * room_allocator.c
 * ================
 * Core DSA implementation for preference-based hostel room recommendation.
 *
 * Data structures used:
 *   - Array of Room structs      : contiguous, cache-friendly, O(1) access
 *   - Array of ScoredRoom structs: for ranked output
 *
 * Algorithms:
 *   1. Linear filter   O(n)    — iterate rooms, keep only AVAILABLE ones
 *   2. Scoring         O(1)    — per room, weighted preference match
 *   3. Insertion sort  O(k^2)  — sort scored rooms by score descending
 *      (k ≤ 192 for this project, so O(k^2) is fast in practice)
 *
 * Overall: O(n + k^2)
 *
 * Integration with Node.js:
 *   This file is compiled into a standalone CLI executable (room_allocator).
 *   The Node.js backend spawns it with JSON input on stdin and reads JSON
 *   output on stdout. No shell-injection risk because input is piped, not
 *   interpolated into a shell command string.
 *
 * Input  (stdin) : JSON object — see parse_input_json() below.
 * Output (stdout): JSON array of scored room objects.
 *
 * Author : DSA PBL Project — Hostel Room Allocation with Preferences
 * Language: C (C99)
 */

#include "room_allocator.h"

/* =========================================================================
 * Internal helpers
 * ========================================================================= */

/* safe string comparison — returns 1 if equal, 0 otherwise */
static int streq(const char *a, const char *b) {
    return strcmp(a, b) == 0;
}

/* =========================================================================
 * weight_for_priority()
 * Priority 1 → weight × 3, Priority 2 → weight × 2, Priority 3 → weight × 1
 * ========================================================================= */
int weight_for_priority(int priority) {
    switch (priority) {
        case 1: return 3;
        case 2: return 2;
        case 3: return 1;
        default: return 1;
    }
}

/* =========================================================================
 * score_room()
 * Calculates 0-100 preference match score for a single room.
 *
 * Scoring breakdown (before priority multipliers):
 *   Block match     : +WEIGHT_BLOCK     (30 pts)
 *   Room type match : +WEIGHT_ROOM_TYPE (40 pts)
 *   Floor match     : +WEIGHT_FLOOR     (20 pts)
 *   Capacity bonus  : +WEIGHT_CAPACITY  (10 pts, proportional)
 *
 * Each criterion is multiplied by weight_for_priority() to reflect the
 * student's stated priority ordering.  The raw total is then normalised
 * to 0-100.
 *
 * Complexity: O(1)
 * ========================================================================= */
int score_room(const Room *room, const Preference *pref, char *reason_out) {
    int raw_score = 0;
    int max_possible = 0;
    char reason[REASON_LEN] = "";

    int wb = weight_for_priority(pref->priority_block);
    int wt = weight_for_priority(pref->priority_room_type);
    int wf = weight_for_priority(pref->priority_floor);

    /* --- Block criterion --- */
    max_possible += WEIGHT_BLOCK * wb;
    if (pref->preferred_block[0] != '\0') {
        if (streq(room->block, pref->preferred_block)) {
            raw_score += WEIGHT_BLOCK * wb;
            if (reason[0]) strncat(reason, ", ", REASON_LEN - strlen(reason) - 1);
            strncat(reason, "preferred block", REASON_LEN - strlen(reason) - 1);
        }
    } else {
        /* No block preference — award full points (neutral) */
        raw_score += WEIGHT_BLOCK * wb;
        max_possible += 0; /* already counted above */
    }

    /* --- Room type criterion --- */
    max_possible += WEIGHT_ROOM_TYPE * wt;
    if (pref->preferred_room_type[0] != '\0') {
        if (streq(room->room_type, pref->preferred_room_type)) {
            raw_score += WEIGHT_ROOM_TYPE * wt;
            if (reason[0]) strncat(reason, ", ", REASON_LEN - strlen(reason) - 1);
            strncat(reason, "preferred room type", REASON_LEN - strlen(reason) - 1);
        }
    } else {
        raw_score += WEIGHT_ROOM_TYPE * wt;
    }

    /* --- Floor criterion --- */
    max_possible += WEIGHT_FLOOR * wf;
    if (pref->preferred_floor > 0) {
        if (room->floor == pref->preferred_floor) {
            raw_score += WEIGHT_FLOOR * wf;
            if (reason[0]) strncat(reason, ", ", REASON_LEN - strlen(reason) - 1);
            strncat(reason, "preferred floor", REASON_LEN - strlen(reason) - 1);
        }
    } else {
        raw_score += WEIGHT_FLOOR * wf;
    }

    /* --- Capacity bonus (small tiebreaker) --- */
    max_possible += WEIGHT_CAPACITY;
    /* Rooms with lower occupancy per person give a slight bonus */
    int cap_score = (room->capacity == 2) ? WEIGHT_CAPACITY :
                    (room->capacity == 3) ? (WEIGHT_CAPACITY * 2 / 3) :
                                             (WEIGHT_CAPACITY / 2);
    raw_score += cap_score;

    /* Normalise to 0-100 */
    int normalised = (max_possible > 0) ? (raw_score * 100 / max_possible) : 0;

    /* Build human-readable reason string */
    if (reason[0] == '\0') {
        strncpy(reason, "Best available alternative", REASON_LEN - 1);
    } else {
        char tmp[REASON_LEN];
        snprintf(tmp, REASON_LEN, "Matches your %s", reason);
        strncpy(reason, tmp, REASON_LEN - 1);
    }
    reason[REASON_LEN - 1] = '\0';

    if (reason_out) {
        strncpy(reason_out, reason, REASON_LEN - 1);
        reason_out[REASON_LEN - 1] = '\0';
    }

    return normalised;
}

/* =========================================================================
 * filter_available_rooms()
 * Linear scan — copy only AVAILABLE rooms into `out`.
 * Complexity: O(n)
 * ========================================================================= */
int filter_available_rooms(const Room *rooms, int count,
                           Room *out, int out_capacity) {
    int k = 0;
    for (int i = 0; i < count && k < out_capacity; i++) {
        if (streq(rooms[i].status, "AVAILABLE")) {
            out[k++] = rooms[i];
        }
    }
    return k;
}

/* =========================================================================
 * insertion_sort_scored()
 * Sort ScoredRoom array by score descending.
 * Insertion sort is ideal here: simple, in-place, stable, fast for k ≤ 192.
 * Complexity: O(k^2) worst case; O(k) when nearly sorted.
 * ========================================================================= */
void insertion_sort_scored(ScoredRoom *arr, int n) {
    for (int i = 1; i < n; i++) {
        ScoredRoom key = arr[i];
        int j = i - 1;
        /* Shift elements with lower score to the right */
        while (j >= 0 && arr[j].score < key.score) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}

/* =========================================================================
 * recommend_rooms()
 * Main recommendation pipeline:
 *   1. Filter available rooms     O(n)
 *   2. Score each eligible room   O(k)
 *   3. Sort by score descending   O(k^2)
 *
 * Overall: O(n + k^2)
 * ========================================================================= */
int recommend_rooms(const Room *rooms, int count,
                    const Preference *pref,
                    ScoredRoom *out, int max_results) {
    /* Step 1: filter */
    Room available[MAX_ROOMS];
    int avail_count = filter_available_rooms(rooms, count,
                                             available, MAX_ROOMS);

    /* Step 2: score */
    ScoredRoom scored[MAX_ROOMS];
    for (int i = 0; i < avail_count; i++) {
        scored[i].room = available[i];
        scored[i].score = score_room(&available[i], pref, scored[i].reason);
    }

    /* Step 3: sort descending by score */
    insertion_sort_scored(scored, avail_count);

    /* Copy top results into output */
    int result_count = (avail_count < max_results) ? avail_count : max_results;
    for (int i = 0; i < result_count; i++) {
        out[i] = scored[i];
    }

    return result_count;
}

/* =========================================================================
 * JSON I/O — CLI interface for Node.js integration
 *
 * Input JSON schema (stdin):
 * {
 *   "preferences": {
 *     "preferred_block": "AC",
 *     "preferred_room_type": "2-Seater",
 *     "preferred_floor": 3,
 *     "priority_block": 2,
 *     "priority_room_type": 1,
 *     "priority_floor": 3
 *   },
 *   "rooms": [
 *     { "room_id":"AC-101", "block":"AC", "floor":1,
 *       "room_type":"2-Seater", "capacity":2, "status":"AVAILABLE" },
 *     ...
 *   ]
 * }
 *
 * Output JSON (stdout):
 * [
 *   { "room_id":"...", "block":"...", "floor":1,
 *     "room_type":"...", "capacity":2, "status":"AVAILABLE",
 *     "score":95, "reason":"Matches your preferred room type, preferred block" },
 *   ...
 * ]
 *
 * We use a minimal hand-written JSON parser to avoid external dependencies.
 * Input is capped at 128 KB; no dynamic allocation.
 * ========================================================================= */

#define MAX_INPUT  (128 * 1024)
#define MAX_LINE   512

/* ----- minimal JSON field extractor ------------------------------------ */

/* Find value of a string key in a flat JSON object starting at `src`.
 * Writes the value (without quotes) into `dest` up to `dest_len` chars.
 * Returns pointer past the closing quote, or NULL on failure. */
static const char *json_str_val(const char *src, const char *key,
                                char *dest, int dest_len) {
    char needle[64];
    snprintf(needle, sizeof(needle), "\"%s\"", key);
    const char *p = strstr(src, needle);
    if (!p) return NULL;
    p += strlen(needle);
    while (*p == ' ' || *p == ':' || *p == '\t') p++;
    if (*p != '"') return NULL;
    p++; /* skip opening quote */
    int i = 0;
    while (*p && *p != '"' && i < dest_len - 1) {
        dest[i++] = *p++;
    }
    dest[i] = '\0';
    if (*p == '"') p++;
    return p;
}

/* Find integer value of a numeric key in a flat JSON object. */
static int json_int_val(const char *src, const char *key) {
    char needle[64];
    snprintf(needle, sizeof(needle), "\"%s\"", key);
    const char *p = strstr(src, needle);
    if (!p) return 0;
    p += strlen(needle);
    while (*p == ' ' || *p == ':' || *p == '\t') p++;
    return atoi(p);
}

/* ----- write one room record as JSON ----------------------------------- */
static void write_scored_room_json(const ScoredRoom *sr, int is_last) {
    printf("  {\n");
    printf("    \"room_id\": \"%s\",\n", sr->room.room_id);
    printf("    \"block\": \"%s\",\n", sr->room.block);
    printf("    \"floor\": %d,\n", sr->room.floor);
    printf("    \"room_type\": \"%s\",\n", sr->room.room_type);
    printf("    \"capacity\": %d,\n", sr->room.capacity);
    printf("    \"status\": \"%s\",\n", sr->room.status);
    printf("    \"score\": %d,\n", sr->score);

    /* Escape reason string for JSON */
    printf("    \"reason\": \"");
    for (const char *c = sr->reason; *c; c++) {
        if (*c == '"')  printf("\\\"");
        else if (*c == '\\') printf("\\\\");
        else            putchar(*c);
    }
    printf("\"\n");
    printf("  }%s\n", is_last ? "" : ",");
}

/* ----- parse one room JSON object (simple, no recursion) --------------- */
static int parse_room(const char *obj, Room *out) {
    json_str_val(obj, "room_id",   out->room_id,   ROOM_ID_LEN);
    json_str_val(obj, "block",     out->block,     BLOCK_LEN);
    json_str_val(obj, "room_type", out->room_type, TYPE_LEN);
    json_str_val(obj, "status",    out->status,    STATUS_LEN);
    out->floor    = json_int_val(obj, "floor");
    out->capacity = json_int_val(obj, "capacity");
    return (out->room_id[0] != '\0') ? 1 : 0;
}

/* =========================================================================
 * main() — entry point for the CLI executable
 * ========================================================================= */
int main(void) {
    /* Read all of stdin into a buffer */
    static char input[MAX_INPUT];
    int total = 0, n;
    while ((n = (int)fread(input + total, 1, MAX_INPUT - total - 1, stdin)) > 0) {
        total += n;
    }
    input[total] = '\0';

    if (total == 0) {
        fprintf(stderr, "room_allocator: no input received on stdin\n");
        printf("[]\n");
        return 1;
    }

    /* --- Parse preferences --- */
    Preference pref = {0};
    pref.preferred_floor = 0; /* 0 = any */

    const char *pref_start = strstr(input, "\"preferences\"");
    if (pref_start) {
        /* Find the opening brace of the preferences object */
        const char *brace = strchr(pref_start, '{');
        if (brace) {
            json_str_val(brace, "preferred_block",     pref.preferred_block,     BLOCK_LEN);
            json_str_val(brace, "preferred_room_type", pref.preferred_room_type, TYPE_LEN);
            pref.preferred_floor     = json_int_val(brace, "preferred_floor");
            pref.priority_block      = json_int_val(brace, "priority_block");
            pref.priority_room_type  = json_int_val(brace, "priority_room_type");
            pref.priority_floor      = json_int_val(brace, "priority_floor");
        }
    }
    /* Ensure priorities are in range */
    if (pref.priority_block     < 1 || pref.priority_block     > 3) pref.priority_block     = 2;
    if (pref.priority_room_type < 1 || pref.priority_room_type > 3) pref.priority_room_type = 1;
    if (pref.priority_floor     < 1 || pref.priority_floor     > 3) pref.priority_floor     = 3;

    /* --- Parse rooms array --- */
    static Room rooms[MAX_ROOMS];
    int room_count = 0;

    const char *rooms_key = strstr(input, "\"rooms\"");
    if (!rooms_key) {
        fprintf(stderr, "room_allocator: 'rooms' key not found in input\n");
        printf("[]\n");
        return 1;
    }
    const char *arr_start = strchr(rooms_key, '[');
    if (!arr_start) {
        printf("[]\n");
        return 1;
    }

    /* Iterate through room objects in the array */
    const char *p = arr_start + 1;
    while (room_count < MAX_ROOMS) {
        /* Skip whitespace and commas */
        while (*p == ' ' || *p == '\n' || *p == '\r' || *p == '\t' || *p == ',') p++;
        if (*p != '{') break;

        /* Find the closing brace — count nesting */
        const char *obj_start = p;
        int depth = 0;
        while (*p) {
            if (*p == '{') depth++;
            else if (*p == '}') { depth--; if (depth == 0) { p++; break; } }
            p++;
        }
        /* obj_start .. p is one room object */
        int obj_len = (int)(p - obj_start);
        char obj_buf[512];
        if (obj_len >= (int)sizeof(obj_buf)) obj_len = (int)sizeof(obj_buf) - 1;
        strncpy(obj_buf, obj_start, obj_len);
        obj_buf[obj_len] = '\0';

        if (parse_room(obj_buf, &rooms[room_count])) {
            room_count++;
        }
    }

    /* --- Run recommendation --- */
    static ScoredRoom results[MAX_RESULTS];
    int result_count = recommend_rooms(rooms, room_count, &pref,
                                       results, MAX_RESULTS);

    /* --- Output JSON array --- */
    printf("[\n");
    for (int i = 0; i < result_count; i++) {
        write_scored_room_json(&results[i], i == result_count - 1);
    }
    printf("]\n");

    return 0;
}
