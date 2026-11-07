# 공개 상태 JSON (쥐구멍 기지 상황판의 재료)

> 하네스(고양이 사무실, goyang-office `src/office/public-status.ts`)가 만들어 3시간마다 올리는 공개 상태의 모양. 기지(`web/base/`)는 이것만 읽는다.
> 주소: `https://yuchism.github.io/goyang-status/status.json` (나중에 `status.goyang.si`로 바뀔 수 있음 — 기지 장면 설정 한 줄).
> 하네스 쪽 모양이 바뀌면 이 문서도 같이 고친다. 버전은 `v`.

## 예시 (v1)
```json
{
  "v": 1,
  "day": "2026-11-07",
  "factory": { "blocked": false, "limit": false },
  "roles": { "implement": "busy", "review": "idle", "image": "idle" },
  "tasks": [
    { "stage": "relay", "round": "2/3", "title": "쥐구멍 기지 1" },
    { "stage": "human_review", "title": null }
  ],
  "recent": [ { "title": "방 둘러보기", "day": "2026-11-07" } ],
  "stats": { "done": 8, "week": 8, "month": 8, "noBlockDays": 1, "deploys": 8, "images": 31, "redraws": 11, "firstPassPct": 40, "relayAvg": 1.8, "rejected": 4, "avgDays": 0.2 }
}
```

## 열쇠
| 열쇠 | 모양 | 뜻 |
|---|---|---|
| `v` | `1` | 모양 버전. 1이 아니면 기지는 데모로 |
| `day` | `"YYYY-MM-DD"` | 올린 날(한국 날짜). 시각은 없음 — "마지막 소식: 오늘·어제·며칠 전"은 기지가 계산 |
| `factory.blocked` / `factory.limit` | 참/거짓 | 막힌 일 / 한도 대기인 일이 하나라도 있음 |
| `roles.implement` · `roles.review` · `roles.image` | `"busy"` \| `"idle"` | 지금 일하는 자리(강고양이 · 검은 고양이 · 붓 고양이). 그림 검수는 review |
| `tasks[]` | `{ stage, round?, title }`, 최대 12 | 지금 진행 중인 일 |
| `recent[]` | `{ title, day }`, 최대 5 | 최근 끝낸 일, 최근 순 |
| `stats` | 아래 표 | 상황판 숫자 |

- `title`: 최대 24자(넘으면 하네스가 `…`로 잘라 보냄). `null`이면 비밀 — "비밀 작업 🐾" / "Secret work 🐾". 이슈 번호는 보내지 않는다.
- `round`: `stage`가 `relay`일 때만, `"1/3"`~`"3/3"`.
- 모르는 열쇠·모르는 `stage`는 무시한다. 글자는 글자로만 그린다(HTML로 넣지 않음).

## stage
| 값 | 한국어 | English |
|---|---|---|
| `approval` | 확정 대기 | Awaiting OK |
| `ready` | 시작 전 | Ready |
| `relay` | 지시서 왕복 | Brief relay |
| `implement` | 구현 | Building |
| `checks` | 검사 | Checking |
| `image` | 그림 | Drawing |
| `image_check` | 그림 검수 | Art check |
| `review` | 검수 | Review |
| `question` | 질문 | Question |
| `human_review` | 사람 검수 | Owner review |
| `deploy` | 배포 | Deploying |
| `blocked` | 막힘 | Blocked |
| `limit` | 한도 대기 | Rate limit |

## stats ↔ 상황판
| 열쇠 | 상황판 | 정의(하네스) |
|---|---|---|
| `done` | 완료 | 끝난 일(부모 이슈 제외) |
| `week` | 이번 주 완료 | 한국 날짜, 월요일부터 |
| `month` | 이번 달 완료 | 한국 날짜 |
| `noBlockDays` | 무장애 ○일 | 마지막 막힘(없으면 첫 기록)부터 날 수 |
| `deploys` | 까치 출동 | 배포되어 끝난 일 |
| `images` | 그림 | 받은 그림 수(같은 경로 다시 그리기는 한 장) |
| `redraws` | 다시 그림 | 그림 검수에서 다시 그리게 한 장 수 |
| `firstPassPct` | 한 방 통과 % | 첫 검수에서 통과한 비율 |
| `relayAvg` | 지시서 왕복 평균 | 소수 한 자리 |
| `rejected` | 어명 반려 | 사람 검수 실패 횟수 |
| `avgDays` | 평균 걸린 날 | 확정 → 끝, 소수 한 자리 |

"이번 주" 화면은 `week`·`month`와 `roles`(지금 당번)·`noBlockDays`를 쓴다. `recent`에서 세지 않는다.
