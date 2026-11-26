#!/usr/bin/env python3
"""쪽지 병 글귀: assets/briefs/beach/notes-draft.md 표 → web/beach/notes.js (tasks/beach-3-bottle.md)
글귀를 고치면 notes-draft.md를 고치고 이걸 돌림. 줄을 지울 땐 번호가 밀리지 않게 표에서 지우지 말고 글을 '-'로 — null이 됨(본 기록 번호 유지)."""
import json, re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
rows = []
for line in (ROOT / 'assets/briefs/beach/notes-draft.md').read_text().splitlines():
    m = re.match(r'\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$', line)
    if m:
        rows.append((int(m[1]), m[2], m[3]))
assert [r[0] for r in rows] == list(range(1, len(rows) + 1)), '번호가 1부터 이어져야 함'
out = ["/* 쪽지 병 글귀 150개 (BEACH_PLAN.md 5장, tasks/beach-3-bottle.md)",
       "   원본: assets/briefs/beach/notes-draft.md (주인 확정 2026-11-26) — tools/make_beach_notes.py로 다시 만듦. 여기서 직접 고치지 말 것",
       "   [한국어, English]. 순서가 곧 번호(0부터) — 본 것 기록(store beachNote.seen)이 이 번호를 씀. 지울 땐 빈 줄 대신 null */",
       "export const NOTES = ["]
for n, ko, en in rows:
    out.append("  " + ("null" if ko == '-' else json.dumps([ko, en], ensure_ascii=False)) + ", // " + str(n))
out.append("];")
(ROOT / 'web/beach/notes.js').write_text("\n".join(out) + "\n")
print(len(rows), '개 → web/beach/notes.js')
