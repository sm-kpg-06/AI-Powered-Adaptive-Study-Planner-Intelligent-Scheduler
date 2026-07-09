import sys
import json
from datetime import datetime, timedelta

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def time_to_mins(t_str):
    if not t_str:
        return 0
    parts = t_str.split(':')
    return int(parts[0]) * 60 + int(parts[1])

def mins_to_time(m):
    m = m % 1440
    return f"{m // 60:02d}:{m % 60:02d}"

def is_overlap(s1, e1, s2, e2):
    return max(s1, s2) < min(e1, e2)

def get_focus_type(difficulty):
    return {"Hard": "Deep Focus", "Medium": "Active Recall", "Easy": "Light Focus"}.get(difficulty, "Active Recall")


# ─────────────────────────────────────────────
# 1. TASK SPLITTING
# ─────────────────────────────────────────────

def split_tasks(tasks):
    """
    Split tasks > 90 min into sequential 90-min chunks.
    Part 1 keeps the original DB id (backend UPDATEs it).
    Parts 2+ get synthetic id "<orig>_p<N>" (backend INSERTs them).
    Naming: "Task Name - Part 1", "Task Name - Part 2", etc.
    Parts are appended IN ORDER so the scheduler assigns them sequentially.
    """
    result = []
    for t in tasks:
        dur        = int(t.get("duration") or 90)
        orig_id    = t.get("id", "")
        base_title = t["title"]

        if dur <= 90:
            # Single chunk — no split needed
            tc = dict(t)
            tc["_originalDuration"] = dur
            tc["_isOriginal"]       = True
            tc["_partIndex"]        = 1
            result.append(tc)
        else:
            # Pre-split into exact 90-min chunks (last chunk may be < 90min)
            remaining = dur
            part_num  = 1
            while remaining > 0:
                chunk = min(90, remaining)
                part  = dict(t)
                part["duration"]          = chunk
                part["_originalDuration"] = chunk
                part["_partIndex"]        = part_num
                # Title: "Task Name - Part 1", "Task Name - Part 2", etc.
                part["title"] = f"{base_title} - Part {part_num}"
                if part_num == 1:
                    # Part 1 maps to the original DB row
                    part["id"]          = orig_id
                    part["_isOriginal"] = True
                else:
                    # Parts 2+ are new synthetic rows
                    part["id"]          = f"{orig_id}_p{part_num}"
                    part["_isOriginal"] = False
                    part["_parentId"]   = orig_id
                result.append(part)
                remaining -= chunk
                part_num  += 1
    return result


# ─────────────────────────────────────────────
# 2. CONSTRAINT VALIDATION
# ─────────────────────────────────────────────

def validate_and_reorder(day_tasks):
    """No same-subject back-to-back, no Hard+Hard consecutive."""
    changed  = True
    attempts = 0
    while changed and attempts < 20:
        changed  = False
        attempts += 1
        for i in range(len(day_tasks) - 1):
            a, b = day_tasks[i], day_tasks[i + 1]
            same_subject = (a.get("subjectId") == b.get("subjectId") and a.get("subjectId"))
            both_hard    = (a.get("difficulty") == "Hard" and b.get("difficulty") == "Hard")
            if same_subject or both_hard:
                for j in range(i + 2, len(day_tasks)):
                    c = day_tasks[j]
                    if c.get("subjectId") != a.get("subjectId") and c.get("difficulty") != "Hard":
                        day_tasks[i + 1], day_tasks[j] = day_tasks[j], day_tasks[i + 1]
                        changed = True
                        break
    return day_tasks


# ─────────────────────────────────────────────
# 3. SLOT ASSIGNMENT
# ─────────────────────────────────────────────

def assign_time_slots(flat_tasks, routine, events):
    """
    Forward-from-today greedy slot assignment.

    Key design decisions:
    - Sorted by deadline ASC → earlier deadline gets priority slots.
    - Each pre-split chunk is placed AS-IS (no adaptive downsizing, no requeue).
      This keeps part numbers clean (Part 1 always before Part 2, etc.).
    - Up to 2 chunks from the same parent can land on the same day
      (morning + afternoon), separated naturally by meal blocks.
    - Hard tasks: max 1 chunk per day.
    - 15-min break reserved after every assigned chunk.
    """
    wake      = routine.get("wakeTime",  "06:00")
    sleep_t   = routine.get("sleepTime", "23:00")
    breakfast = routine.get("breakfastTime")
    lunch     = routine.get("lunchTime")
    dinner    = routine.get("dinnerTime")
    timetable_str = routine.get("timetable")

    wake_m  = time_to_mins(wake)
    sleep_m = time_to_mins(sleep_t)
    if sleep_m <= wake_m:
        sleep_m += 1440

    timetable = {}
    if timetable_str:
        try:
            timetable = json.loads(timetable_str)
        except Exception:
            pass

    BREAK_MINS     = 15
    base_date      = datetime.now() + timedelta(days=1)
    assigned_tasks = []
    day_busy: dict = {}

    def get_base_busy(date_str, sched_date):
        blocks = []
        if breakfast:
            blocks.append((time_to_mins(breakfast), time_to_mins(breakfast) + 30))
        if lunch:
            blocks.append((time_to_mins(lunch), time_to_mins(lunch) + 45))
        if dinner:
            blocks.append((time_to_mins(dinner), time_to_mins(dinner) + 45))
        is_holiday = any(
            ev.get("type") == "HOLIDAY" and ev.get("date", "").startswith(date_str)
            for ev in events
        )
        day_name = sched_date.strftime("%A")
        if day_name in timetable and not is_holiday:
            for slot in timetable[day_name]:
                blocks.append((time_to_mins(slot["start"]), time_to_mins(slot["end"])))
        for ev in events:
            if ev.get("date", "").startswith(date_str) and ev.get("startTime") and ev.get("endTime"):
                blocks.append((time_to_mins(ev["startTime"]), time_to_mins(ev["endTime"])))
        return blocks

    # Sort by deadline ASC → earlier-deadline tasks get the best (earliest) slots
    flat_tasks.sort(key=lambda x: x.get("deadline") or "2099-12-31")

    for t in flat_tasks:
        assigned     = False
        days_checked = 0
        deadline_date = None
        if t.get("deadline"):
            try:
                deadline_date = datetime.strptime(t["deadline"][:10], "%Y-%m-%d")
            except Exception:
                pass

        # Exact chunk size — NO adaptive downsizing, NO requeue
        # (pre-split already created all chunks in the right sizes)
        chunk_size = int(t.get("duration") or 90)

        while not assigned and days_checked < 90:
            sched_date = base_date + timedelta(days=days_checked)

            # Never schedule on or after deadline
            if deadline_date and sched_date >= deadline_date:
                break

            date_str   = sched_date.strftime("%Y-%m-%d")
            difficulty = t.get("difficulty", "Medium")

            # Hard tasks: 1 chunk per day max
            hard_today = sum(1 for at in assigned_tasks
                             if at.get("dateStr") == date_str and at.get("difficulty") == "Hard")
            if difficulty == "Hard" and hard_today >= 1:
                days_checked += 1
                continue

            # Day-packing: max 2 chunks per day from same parent (non-Hard)
            parent_id = t.get("_parentId") or t["id"].split("_p")[0]
            same_parent_today = sum(
                1 for at in assigned_tasks
                if at.get("dateStr") == date_str
                and (at.get("_parentId") or at["id"].split("_p")[0]) == parent_id
            )
            max_per_day = 1 if difficulty == "Hard" else 2
            if same_parent_today >= max_per_day:
                days_checked += 1
                continue

            # Build busy blocks
            busy = get_base_busy(date_str, sched_date)
            busy += day_busy.get(date_str, [])

            # Scan the full day (wake→sleep); meals are already in busy[]
            found_start = -1
            for cur_m in range(wake_m, sleep_m - chunk_size + 1, 5):
                end_m = cur_m + chunk_size
                if any(is_overlap(cur_m, end_m, b[0], b[1]) for b in busy):
                    continue
                found_start = cur_m
                break

            if found_start != -1:
                end_m = found_start + chunk_size
                t["dateStr"]       = date_str
                t["scheduledDate"] = f"{date_str}T{mins_to_time(found_start)}:00Z"
                t["startTime"]     = mins_to_time(found_start)
                t["endTime"]       = mins_to_time(end_m)
                t["duration"]      = chunk_size
                t["focusType"]     = get_focus_type(difficulty)
                t["_parentId"]     = parent_id
                assigned_tasks.append(t)

                # Reserve slot + 15-min break after
                day_busy.setdefault(date_str, []).append((found_start, end_m + BREAK_MINS))
                assigned = True
            else:
                days_checked += 1

        if not assigned:
            t["_unscheduled"] = True
            assigned_tasks.append(t)

    return assigned_tasks


# ─────────────────────────────────────────────
# 4. DAILY VIEW GENERATION
# ─────────────────────────────────────────────

def generate_daily_view(assigned_tasks, BREAK_MINS=15):
    """Build per-date ordered list with Break entries. Tasks sorted by startTime."""
    from collections import defaultdict
    by_date = defaultdict(list)
    for t in assigned_tasks:
        if t.get("dateStr") and not t.get("_unscheduled"):
            by_date[t["dateStr"]].append(t)

    daily_view = {}
    for date_str, day_tasks in sorted(by_date.items()):
        # Sort by startTime string — ensures Part 1 (earliest slot) comes first
        day_tasks.sort(key=lambda x: x.get("startTime", "00:00"))
        day_tasks = validate_and_reorder(day_tasks)

        entries = []
        for task in day_tasks:
            entries.append({
                "type":       "task",
                "startTime":  task["startTime"],
                "endTime":    task["endTime"],
                "timeRange":  f"{task['startTime']}–{task['endTime']}",
                "subject":    task.get("subjectName", ""),
                "examName":   task.get("examName", ""),
                "topic":      task.get("topicName", task.get("title", "")),
                "title":      task.get("title", ""),
                "duration":   task.get("duration", 0),
                "durationH":  round(task.get("duration", 0) / 60, 1),
                "difficulty": task.get("difficulty", "Medium"),
                "focusType":  task.get("focusType", get_focus_type(task.get("difficulty", "Medium"))),
                "taskType":   task.get("taskType", "ASSIGNMENT"),
                "id":         task.get("id", ""),
                "isCompleted":task.get("isCompleted", False),
                "subjectId":  task.get("subjectId", ""),
                "examId":     task.get("examId", ""),
                "isOriginal": task.get("_isOriginal", True),
                "parentId":   task.get("_parentId", ""),
            })
            # 15-min break after each task
            end_m     = time_to_mins(task["endTime"])
            brk_start = end_m
            brk_end   = brk_start + BREAK_MINS
            entries.append({
                "type":      "break",
                "startTime": mins_to_time(brk_start),
                "endTime":   mins_to_time(brk_end),
                "timeRange": f"{mins_to_time(brk_start)}–{mins_to_time(brk_end)}",
                "title":     "Break",
            })

        daily_view[date_str] = entries

    return daily_view


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    input_data = sys.stdin.read()
    if not input_data:
        print(json.dumps({"error": "No input provided"}))
        sys.exit(1)

    try:
        data    = json.loads(input_data)
        routine = data.get("routine", {})
        tasks   = data.get("tasks", [])
        events  = data.get("events", [])

        for t in tasks:
            if not t.get("difficulty"):
                t["difficulty"] = "Medium"
            if not t.get("duration"):
                d = t["difficulty"]
                t["duration"] = 90 if d == "Hard" else (60 if d == "Medium" else 30)
            t["focusType"] = get_focus_type(t["difficulty"])

        # Step 1: Pre-split all long tasks into ordered chunks
        flat_tasks = split_tasks(tasks)

        # Step 2: Assign time slots (no requeue, no adaptive downsizing)
        assigned = assign_time_slots(flat_tasks, routine, events)

        # Step 3: Build daily view with startTime-ordered entries
        daily_view = generate_daily_view(assigned)

        print(json.dumps({"schedule": assigned, "dailyView": daily_view}))

    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}))
        sys.exit(1)


if __name__ == "__main__":
    main()
