import urllib.request, json, sys

BASE = "http://localhost:5000/api"

def req(method, path, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    r = urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers, method=method))
    return json.loads(r.read())

print("=" * 60)
print("TEST 1: Stats endpoint")
stats = req("GET", "/rooms/stats")
assert stats["total"] == 192, f"Expected 192, got {stats['total']}"
assert stats["available"] == 192, f"Expected 192 available, got {stats['available']}"
assert stats["reserved"] == 0
print(f"  PASS: {stats['total']} rooms, {stats['available']} available, {stats['reserved']} reserved")

print("\nTEST 2: Floor breakdown")
for row in stats["byFloor"]:
    assert row["total"] == 16, f"Expected 16 on floor {row['floor']}, got {row['total']}"
    assert row["available"] == 16
print(f"  PASS: All 12 floors have 16 rooms each")

print("\nTEST 3: Recommendations via C algorithm")
recs = req("POST", "/recommendations", {
    "preferred_block": "AC",
    "preferred_room_type": "2-Seater",
    "preferred_floor": 2,
    "priority_block": 2,
    "priority_room_type": 1,
    "priority_floor": 3
})
assert len(recs["recommendations"]) > 0, "No recommendations returned"
top = recs["recommendations"][0]
assert top["status"] == "AVAILABLE", "Top recommendation is not AVAILABLE"
assert top["score"] is not None
print(f"  PASS: Got {len(recs['recommendations'])} recs, top = {top['room_id']} score={top['score']}")
print(f"  Top reason: {top['reason']}")

print("\nTEST 4: Create a reservation")
res = req("POST", "/reservations", {
    "room_id": "AC-101",
    "full_name": "Priya Sharma",
    "roll_number": "22CS001",
    "email": "priya.sharma@college.edu.in",
    "mobile": "9876543210",
    "department": "Computer Science & Engineering",
    "academic_year": "2nd Year"
})
assert res["success"] == True
rid = res["reservation_id"]
print(f"  PASS: Reservation created: {rid}")

print("\nTEST 5: Verify room is now RESERVED")
room = req("GET", "/rooms/AC-101")
assert room["status"] == "RESERVED", f"Room should be RESERVED, got {room['status']}"
print(f"  PASS: AC-101 is now RESERVED")

print("\nTEST 6: Stats updated")
stats2 = req("GET", "/rooms/stats")
assert stats2["reserved"] == 1
assert stats2["available"] == 191
print(f"  PASS: {stats2['available']} available, {stats2['reserved']} reserved")

print("\nTEST 7: Duplicate room reservation rejected")
try:
    req("POST", "/reservations", {
        "room_id": "AC-101",
        "full_name": "Rahul Kumar",
        "roll_number": "22CS002",
        "email": "rahul@college.edu.in",
        "mobile": "9876543211",
        "department": "Information Technology",
        "academic_year": "1st Year"
    })
    print("  FAIL: Should have rejected duplicate reservation!")
    sys.exit(1)
except urllib.error.HTTPError as e:
    assert e.code == 409, f"Expected 409, got {e.code}"
    body = json.loads(e.read())
    print(f"  PASS: Duplicate rejected with 409: {body['error'][:60]}...")

print("\nTEST 8: Duplicate student reservation rejected")
try:
    req("POST", "/reservations", {
        "room_id": "AC-102",
        "full_name": "Priya Sharma",
        "roll_number": "22CS001",  # same roll number
        "email": "priya.sharma@college.edu.in",
        "mobile": "9876543210",
        "department": "Computer Science & Engineering",
        "academic_year": "2nd Year"
    })
    print("  FAIL: Should have rejected duplicate student reservation!")
    sys.exit(1)
except urllib.error.HTTPError as e:
    assert e.code == 409
    print(f"  PASS: Duplicate student reservation rejected with 409")

print("\nTEST 9: Reservation lookup")
lookup = req("GET", f"/reservations/lookup?reservation_id={rid}&roll_number=22CS001")
assert lookup["reservation_id"] == rid
assert lookup["room_id"] == "AC-101"
print(f"  PASS: Lookup returned correct reservation: {lookup['room_id']}")

print("\nTEST 10: Recommendations exclude reserved rooms")
recs2 = req("POST", "/recommendations", {
    "preferred_block": "AC",
    "preferred_room_type": "2-Seater",
    "preferred_floor": 1,
    "priority_block": 2,
    "priority_room_type": 1,
    "priority_floor": 3
})
room_ids = [r["room_id"] for r in recs2["recommendations"]]
assert "AC-101" not in room_ids, "Reserved room AC-101 should not be in recommendations!"
print(f"  PASS: AC-101 (reserved) not in {len(recs2['recommendations'])} recommendations")

print("\n" + "=" * 60)
print("ALL TESTS PASSED ✓")
print("=" * 60)
