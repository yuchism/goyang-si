"""objects.json → OBJECTS.md
사물 목록(objects.json)이 바뀌면 이 스크립트로 문서를 다시 만든다.
캐릭터·환경·화면 위 요소는 objects.json에 없으므로 아래에 직접 적는다.
"""
import json, sys

src = sys.argv[1] if len(sys.argv) > 1 else 'web/scenes/room/objects.json'
out = sys.argv[2] if len(sys.argv) > 2 else 'OBJECTS.md'
data = json.load(open(src, encoding='utf-8'))
objs = data['objects']

WHEN = {None: '항상', 'always': '항상', 'summer': '여름', 'winter': '겨울', 'halloween': '할로윈',
        'christmas': '크리스마스', 'boxDay': '상자 있는 날 (9일 중 3일)', 'treat': '기념일 간식을 받은 날', 'doorClosed': '문이 닫혀 있을 때'}
LAYER = {'background': '배경', 'wall': '벽', 'floor-flat': '바닥에 깔림', 'floor': '바닥 (앞뒤 정렬)', None: '-'}
WHO = {'cat': '강고양이 씨', 'mouse': '쥐야쥐'}
TOUCH = {'note': '오늘의 메모 보기', 'screen': '노트북 화면 보기', 'shelf': '책장 메뉴 열기', 'tv': 'TV 편성표 보기', 'frame': '액자 사진 넘기기'}
SPOTNAME = {'watch': '바라보기', 'side': '올라가고 내려오는 곳', 'behind': 'TV 뒤 빼꼼', 'rainCat': '비 구경(고양이)', 'rainMouse': '비 구경(쥐야쥐)', 'bird': '새 구경',
            'wait': '기다리기', 'greet': '마중', 'nap': '낮잠', 'push': '앞발로 밀기', 'type': '타자',
            'enter': '들어가기 전', 'inside': '안', 'check': '기웃거리기', 'hide': '숨기', 'popout': '튀어나오기',
            'eat': '밥 먹기', 'out': '나오는 곳', 'tap': '화면 톡', 'ghost': '유령 그림자 보러 가기'}


def look(o):
    l = o.get('look')
    if not l:
        return '없음'
    if l.startswith('code:'):
        return '코드 그림'
    imgs = {l}
    for st in (o.get('states') or {}).values():
        if st.get('look') and not st['look'].startswith('code:'):
            imgs.add(st['look'])
    if o.get('img'):
        imgs = {o['img']}
    return ', '.join(f'`{i}`' for i in sorted(imgs))


def body(o):
    b = o.get('body')
    if not b:
        return '-'
    return ', '.join(WHO[w] for w in b['blocks']) + ' 막음'


def spots(o):
    sp = o.get('spots') or {}
    if not sp:
        return '-'
    return ', '.join(f"{SPOTNAME.get(k, k)} `{o['id']}.{k}`" for k in sp)


def states(o):
    st = o.get('states')
    if not st:
        return '-'
    return ' / '.join(st.keys())


L = []
w = L.append
w('# 고양.시 사물 정리')
w('')
w('> 기준 파일: `web/scenes/room/objects.json` (이 문서는 `make_objects_doc.py`로 그 파일에서 만든다)')
w('> 좌표: 방 기준 가로 1200, 세로 760, 바닥선 y=500. 캐릭터가 걷는 바닥은 y 592~740')
w('')
w('## 1. 특성')
w('')
w('물건을 분류 하나로 고정하지 않고, 아래 특성을 조합해서 기술한다. 상태가 바뀌면 특성도 바뀔 수 있다 (예: 컵은 탁자 위에선 인터랙션 물건, 떨어지면 장식).')
w('')
w('| 특성 | objects.json 키 | 뜻 |')
w('|---|---|---|')
w('| 분류 | `kind` | 아래 2장의 분류 |')
w('| 층 | `layer` | 배경 → 벽 → 바닥에 깔림 → 바닥(앞뒤 정렬) 순서로 그린다 |')
w('| 모습 | `look` | 그림 이름(`web/r/`), 또는 `code:이름`이면 코드로 그림 |')
w('| 위치 | `pos` / `area` | `pos`는 그림의 아래 가운데와 폭, `area`는 사각형 [x, y, 폭, 높이] |')
w('| 높이 | `on` / `z` / `top` | `on`은 밑에 있는 물건, `z`는 바닥에서 뜬 높이, `top`은 위에 물건을 얹는 면의 높이. 깊이는 밑 물건을 따르고 그림만 올라간다 |')
w('| 소켓 | `sockets` | 그림 안의 한 점 [x비율, y비율]. 노트북 키보드와 고양이 앞발, 화면 안쪽 영역 등 |')
w('| 뒤집기 | `flip` | true면 그림을 좌우로 뒤집어 그린다 |')
w('| 깊이 | `pos.y` 또는 `depth` | 바닥에 닿는 높이. 이 값이 작을수록 뒤(먼저 그림). 캐릭터도 같은 기준으로 섞여 정렬 |')
w('| 몸 | `body` | 바닥에서 차지하는 사각형과 막히는 대상. 캐릭터는 돌아서 간다 |')
w('| 자리 | `spots` | 캐릭터가 서는 곳 [x, y, 바라보는 방향]. 행동은 `S(\'bowl.eat\')`처럼 이름으로 부른다 |')
w('| 상태 | `states` | 상태별로 모습·자리·분류를 덮어쓴다. 상태 판단은 코드의 `STATE` |')
w('| 등장 조건 | `when` | 계절, 기념일, 상자 있는 날 등. 코드의 `WHEN` |')
w('| 터치 | `touch` | 보는 사람이 눌렀을 때. 캐릭터 인터랙션과 따로 둔다. 코드의 `TOUCH` |')
w('| 누르는 범위 | `hitPad` | 누르는 범위를 그림보다 사방으로 넓히는 양(기본 6). 범위가 겹치면 그림에 더 가까운 물건이 눌린다 |')
w('| 사진 | `photos` | 액자 사진 목록(`web/r/` 그림 이름). 날짜마다 한 장씩 돌아간다. 코드는 `frame.js` |')
w('| 배경 입구 | `mouth` | 쥐구멍: 배경 그림의 입구 {cx, bottom, w, h}. 빼꼼 그림을 이 모양으로 자른다 (`sprites.js` `HOLE`) |')
w('| 이상한 책 | `oddBook` | 책장: 기대는 자리 `lean` [책 끝 x, 선반 위 y]와 이름표 영역 `tag` [x, y, 폭, 높이] (`install.js`·`shelf.js`) |')
w('| 말풍선 높이 | `sayY` | 문: 만득 씨 말풍선이 뜨는 y (`manduk.js`) |')
w('')
w('## 2. 분류')
w('')
w('| 분류 | 뜻 |')
w('|---|---|')
w('| 캐릭터 | 스프라이트로 움직이고 스스로 행동한다 (objects.json 밖, 3장) |')
for k, v in data['kinds'].items():
    name = {'interactive': '인터랙션 물건', 'solid': '물체', 'surface': '바닥 자리', 'hideout': '숨는 곳', 'spot': '자리', 'decor': '장식'}[k]
    w(f'| {name} (`{k}`) | {v.split(": ", 1)[1]} |')
w('| 환경 | 시간과 날씨에 따라 바뀌는 코드 그림 (4장) |')
w('| 화면 위 | 말풍선, 자막, 효과 (5장) |')
w('')

ORDER = [('interactive', '인터랙션 물건'), ('solid', '물체'), ('surface', '바닥 자리'), ('hideout', '숨는 곳'), ('spot', '자리'), ('decor', '장식')]
for k, title in ORDER:
    group = [o for o in objs if o['kind'] == k]
    if not group:
        continue
    w(f'### {title}')
    w('')
    if k in ('hideout', 'spot'):
        w('| 이름 | id | 자리 | 등장 | 메모 |')
        w('|---|---|---|---|---|')
        for o in group:
            w(f"| {o['name']} | `{o['id']}` | {spots(o)} | {WHEN[o.get('when')]} | {o.get('note', '')} |")
    else:
        w('| 이름 | id | 층 | 모습 | 몸 | 자리 | 상태 | 등장 | 터치 | 메모 |')
        w('|---|---|---|---|---|---|---|---|---|---|')
        for o in group:
            w(f"| {o['name']} | `{o['id']}` | {LAYER[o.get('layer')]} | {look(o)} | {body(o)} | {spots(o)} | {states(o)} | {WHEN[o.get('when')]} | {TOUCH.get(o.get('touch'), '-')} | {o.get('note', '')} |")
    w('')

w('## 3. 캐릭터 (objects.json 밖)')
w('')
w('| 이름 | 모습 | 몸 | 메모 |')
w('|---|---|---|---|')
w('| 강고양이 씨 | 스프라이트 68장 (`web/f/cat_*`) | 상자·노트북·밥그릇·탁자·선풍기·호박을 돌아감 | 걷기·달리기, 자세 전환(앉기·기지개·뒤집기), 동작 클립 13종 |')
w('| 쥐야쥐 | 스프라이트 9장 (`web/f/mouse_*`) | 탁자 밑은 통과, 나머지는 돌아감 | 숨는 곳에서 나오고 숨는다. 만득 씨에게 절대 들키지 않음 |')
w('| 나비 | 그림 4장 (`web/r/fx/bfly_*`) | 없음 | 봄·여름 낮에 창으로 들어와 날아다님. 둘이 같이 구경 |')
w('| 난간의 새 (비둘기·까치) | 그림 4장 (`web/r/fx/pigeon_*`, `magpie_*`), 날기는 `fx/bird_*` | 없음 | 낮에 하루 4~8번(날짜로 정해짐) 난간 윗단에 앉았다 감. 강고양이 씨가 창가에서 채터링(`f/cat_chatter_*`). WINDOW_PLAN.md 5-1 |')
w('| 작은 검은 고양이 | 그림 5장 (`web/r/fx/blackcat_*`) | 없음 | 해질녘·밤, 3일에 1번 꼴. 창 아랫단 너머 빼꼼 또는 난간 걷기. 밤엔 눈이 먼저 반짝. 강고양이 씨가 다가가면 도망. WINDOW_PLAN.md 5-2 |')
w('| 김만득 씨 | 모습 없음, 말풍선만 | 없음 | 문이 열리면 말풍선. 한 일은 결과로만 보임 (밥, 컵 치우기, 불 끄기) |')
w('')
w('## 4. 환경 (코드 그림)')
w('')
w('| 이름 | 메모 |')
w('|---|---|')
w('| 하늘, 해, 달, 구름 | 창밖. 시간에 따라 |')
w('| 새벽·노을 빛 | 창에 덧입히는 색 |')
w('| 비 | 창밖 빗줄기. 날짜별로 정해짐 |')
w('| 창밖 새 | 그림 3장. 창가에서 구경할 때 지나감 |')
w('| UFO | 그림 2장. 밤에 며칠에 한 번, 만득 씨가 없을 때만. 강고양이 씨가 노트북을 친 직후면 자주 오고 불빛을 깜빡임 |')
w('| 건너편 창 불빛 | 밤 아파트 그림의 창마다(`web/r/apt_windows.json`) 해 진 뒤 하나둘 켜지고 밤이 깊을수록 꺼짐. 금·토 밤은 늦게까지 |')
w('| 천둥번개 | 비 오는 날 일부(여름 35%, 그 밖 10%). 창밖 하늘이 하얗게 번쩍(건물은 실루엣) + 방에 짧은 흰 빛, "…우르릉…". 실제 2초에 한 번까지 |')
w('| 무지개 | 비 그친 직후(해 지기 1시간 전까지) 50%. 아파트 뒤로 들어가는 일곱 색 호 |')
w('| 비행기 | 하루 2~4번. 낮엔 작은 비행기와 비행기구름, 밤엔 빨간·흰 불빛 |')
w('| 햇빛 조각, 빛기둥 | 바닥을 가로질러 이동. 낮잠 자리 역할도 함 |')
w('| 밤 어둠, 스탠드 불빛 | 시간에 따라 |')
w('| 캐릭터 그림자 | 발밑 반투명 타원 |')
w('')
w('## 5. 화면 위')
w('')
w('| 이름 | 메모 |')
w('|---|---|')
w('| 기분 말풍선 | 틀은 코드, 안은 손그림 아이콘 24개(`web/r/icon/`). 코드에서 이모지로 쓰면 아이콘으로 바뀐다(`EMO` 표) |')
w('| 만득 씨 말풍선 | 문 쪽을 가리킴 |')
w('| 자막 | "뚜벅 뚜벅…", "…TV 소리…" 등 |')
w('| 화면 톡 물결 | 강고양이 씨가 화면을 톡 했을 때 |')
w('| 포스트잇 메모, 노트북 화면 | 터치하면 뜨는 창 (HTML) |')
w('')
w('## 6. 새 물건을 넣을 때')
w('')
w('1. 그림을 `web/r/`에 넣는다 (투명 PNG나 WebP)')
w('2. `objects.json`에 한 줄 추가: `id`, `name`, `kind`, `layer`, `look`, `pos`')
w('3. 길을 막으면 `body`, 캐릭터가 쓰면 `spots`, 모습이 바뀌면 `states`(+ 코드의 `STATE`), 가끔만 나오면 `when`')
w('4. 새 행동은 자리 이름으로 부른다: `go(...S(\'물건.자리\'))`')
w('5. `python3 make_objects_doc.py web/scenes/room/objects.json OBJECTS.md`로 이 문서를 다시 만든다')
w('')
w('## 7. 아직 그림이 없는 것')
w('')
codes = [o['name'] for o in objs if (o.get('look') or '').startswith('code:') and o['kind'] not in ('interactive',) and o['id'] not in ('curtain_l', 'curtain_r')]
w('- 사물: ' + (', '.join(codes) or '없음'))
w('- 없음 (나비, 창밖 새, 선풍기, 말풍선 아이콘, UFO 모두 그림으로 교체됨)')
w('- 사용하지 않는 그림: `door_closed` (배경 그림의 닫힌 문을 그대로 씀)')
# 사물에 안 붙은 범위·경로 (SCENE_PLAN.md 4단계)
if data.get('areas') or data.get('paths'):
    w('')
    w('## 8. 사물에 안 붙은 범위·경로·자리')
    w('')
    w("코드는 범위를 `A('이름')`(그 안에서 무작위 `ax`·`ay`·`aPt`), 경로를 `PATH('이름')`, 기능별 자리를 `PL('이름')`으로 꺼낸다 (`objects.js`).")
    w('')
    w('| 범위 | x | y | 메모 |')
    w('|---|---|---|---|')
    rng = lambda v: f'{v[0]}~{v[1]}' if v else '-'
    for k, a in data.get('areas', {}).items():
        w(f"| `{k}` | {rng(a.get('x'))} | {rng(a.get('y'))} | {a.get('note', '')} |")
    w('')
    w('| 경로 | 점 | 메모 |')
    w('|---|---|---|')
    for k, p in data.get('paths', {}).items():
        pts = ' → '.join(f'({x}, {y})' for x, y in p['points'])
        w(f"| `{k}` | {pts} | {p.get('note', '')} |")
    w('')
    w("| 자리 (`PL('이름')`) | 값 | 메모 |")
    w('|---|---|---|')
    for k, p in data.get('places', {}).items():
        val = ', '.join(f'{a} {p[a]}' for a in p if a != 'note')
        w(f"| `{k}` | {val} | {p.get('note', '')} |")

open(out, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('wrote', out, len(L), 'lines')
