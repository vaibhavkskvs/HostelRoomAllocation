/*
 * room_allocator.h
 * ================
 * Header file for the Hostel Room Allocation DSA module.
 *
 * This module implements preference-based room recommendation using:
 *   - Structures (Room, Preference, ScoredRoom)
 *   - Linear search / filtering  : O(n)
 *   - Insertion sort by score    : O(k^2) worst case, practical for k ≤ 192
 *   - Weighted scoring function  : O(1) per room
 *
 * Overall complexity: O(n + k^2) where n = total rooms, k = eligible rooms.
 * For n = 192, k ≤ 192, this is entirely negligible.
 *
 * Author : DSA PBL Project — Hostel Room Allocation with Preferences
 * Language: C (C99)
 */

#ifndef ROOM_ALLOCATOR_H
#define ROOM_ALLOCATOR_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* -----------------------------------------------------------------------
 * Constants
 * ----------------------------------------------------------------------- */
#define MAX_ROOMS          200
#define MAX_RESULTS        192
#define ROOM_ID_LEN        16
#define BLOCK_LEN          8
#define TYPE_LEN           16
#define STATUS_LEN         16
#define REASON_LEN         256

/* Score weights — configurable without recompiling */
#define WEIGHT_BLOCK       30
#define WEIGHT_ROOM_TYPE   40
#define WEIGHT_FLOOR       20
#define WEIGHT_CAPACITY    10

/* -----------------------------------------------------------------------
 * Room structure
 * Each field maps directly to a column in the SQLite rooms table.
 * ----------------------------------------------------------------------- */
typedef struct {
    char room_id[ROOM_ID_LEN];   /* e.g. "AC-203"      */
    char block[BLOCK_LEN];       /* "AC" or "NAC"       */
    int  floor;                  /* 1-6                 */
    char room_type[TYPE_LEN];    /* "2-Seater" etc.     */
    int  capacity;               /* 2, 3, or 4          */
    char status[STATUS_LEN];     /* "AVAILABLE"/"RESERVED" */
} Room;

/* -----------------------------------------------------------------------
 * Student preference structure
 * priority_* fields rank the three criteria:
 *   1 = highest priority, 2 = second, 3 = lowest.
 * Setting a preferred_* field to "" means "no preference".
 * ----------------------------------------------------------------------- */
typedef struct {
    char preferred_block[BLOCK_LEN];      /* "AC", "NAC", or ""  */
    char preferred_room_type[TYPE_LEN];   /* "2-Seater", etc.    */
    int  preferred_floor;                 /* 1-6, or 0 = any     */
    int  priority_block;                  /* 1,2,3               */
    int  priority_room_type;              /* 1,2,3               */
    int  priority_floor;                  /* 1,2,3               */
} Preference;

/* -----------------------------------------------------------------------
 * Scored room — pairs a Room with its recommendation score and reason.
 * ----------------------------------------------------------------------- */
typedef struct {
    Room room;
    int  score;
    char reason[REASON_LEN];
} ScoredRoom;

/* -----------------------------------------------------------------------
 * Public API
 * ----------------------------------------------------------------------- */

/*
 * score_room()
 * ------------
 * Calculate a preference score (0–100) for a single room.
 * Higher = better match.
 * Complexity: O(1)
 */
int score_room(const Room *room, const Preference *pref, char *reason_out);

/*
 * filter_available_rooms()
 * ------------------------
 * Copy only AVAILABLE rooms from `rooms` into `out`.
 * Returns the number of rooms written to `out`.
 * Complexity: O(n)
 */
int filter_available_rooms(const Room *rooms, int count,
                           Room *out, int out_capacity);

/*
 * recommend_rooms()
 * -----------------
 * Main entry point.
 * Reads rooms from `rooms` (count elements), filters out reserved rooms,
 * scores each eligible room against `pref`, sorts by score descending,
 * and writes up to `max_results` ScoredRoom records into `out`.
 * Returns the number of results written.
 * Complexity: O(n + k^2) — filter O(n) + insertion-sort O(k^2)
 */
int recommend_rooms(const Room *rooms, int count,
                    const Preference *pref,
                    ScoredRoom *out, int max_results);

/*
 * insertion_sort_scored()
 * -----------------------
 * Sort an array of ScoredRoom by score descending (in-place).
 * Uses insertion sort — simple, cache-friendly, good for small k.
 * Complexity: O(k^2) worst case, O(k) when nearly sorted.
 */
void insertion_sort_scored(ScoredRoom *arr, int n);

/*
 * weight_for_priority()
 * ---------------------
 * Return the multiplier for a criterion given its priority rank.
 * Priority 1 → 3×, Priority 2 → 2×, Priority 3 → 1×.
 */
int weight_for_priority(int priority);

#endif /* ROOM_ALLOCATOR_H */
