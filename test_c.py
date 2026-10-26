import subprocess, json, sys

test_input = {
    "preferences": {
        "preferred_block": "AC",
        "preferred_room_type": "2-Seater",
        "preferred_floor": 3,
        "priority_block": 2,
        "priority_room_type": 1,
        "priority_floor": 3
    },
    "rooms": [
        {"room_id": "AC-301", "block": "AC", "floor": 3, "room_type": "2-Seater", "capacity": 2, "status": "AVAILABLE"},
        {"room_id": "AC-302", "block": "AC", "floor": 3, "room_type": "3-Seater", "capacity": 3, "status": "AVAILABLE"},
        {"room_id": "NAC-101","block": "NAC","floor": 1, "room_type": "2-Seater", "capacity": 2, "status": "RESERVED"},
        {"room_id": "AC-106", "block": "AC", "floor": 1, "room_type": "3-Seater", "capacity": 3, "status": "AVAILABLE"},
    ]
}

inp = json.dumps(test_input)
result = subprocess.run(
    ["c-algorithms\\room_allocator.exe"],
    input=inp.encode(),
    capture_output=True
)

print("=== STDOUT ===")
print(result.stdout.decode())
print("=== STDERR ===")
print(result.stderr.decode())
print("=== Return code:", result.returncode)

if result.returncode == 0:
    data = json.loads(result.stdout.decode())
    print("=== Parsed results ===")
    for r in data:
        print(f"  {r['room_id']:10} score={r['score']:3}  {r['reason']}")
