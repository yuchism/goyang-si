/* 말: 화면에 나오는 글자를 한국어·영어로. 자세한 내용은 ENGLISH_PLAN.md
   - 처음 언어: 저장해 둔 것 → 없으면 브라우저 언어(ko로 시작하면 한국어, 아니면 영어)
   - tr('키', {이름: 값}): 지금 언어의 글자. 목록(배열)은 그대로 돌려준다. {name} 같은 자리는 vars로 채운다
   - HTML 글자는 data-i18n(글자), data-i18n-html(태그 포함), data-i18n-aria(접근성 라벨)로 표시해 두면 setLang이 채운다
   - 새 글자는 아래 STR 표 한 곳에만 넣는다 (책장 책 제목·설명은 objects.json의 책마다 en) */
import { setHandFont, store } from './util.js';
export const STR = {
  /* ── 페이지 ── */
  title: { ko: '고양.시', en: 'goyang.si' },
  metaDesc: { ko: '강고양이 씨가 사는 방. 실제 시간에 맞춰 졸고, 햇빛을 따라가고, 가끔 쥐야쥐를 쫓는다.', en: 'The room where Kitty Kang lives. Dozes on real time, follows the sunlight, and now and then chases Mousey.' },
  mark: { ko: '고양<b>.</b>시', en: 'goyang<b>.</b>si' },
  canvas: { ko: '강고양이 씨의 방', en: "Kitty Kang's room" },
  partyHint: { ko: '눌러서 파티 시작', en: 'tap to start the party' },
  a11y: { ko: '방 상호작용', en: 'Room actions' },
  aCat: { ko: '강고양이 씨 쓰다듬기', en: 'Pet Kitty Kang' },
  aMouse: { ko: '쥐야쥐 놀라게 하기', en: 'Startle Mousey' },
  aNote: { ko: '오늘의 포스트잇 읽기', en: "Read today's sticky note" },
  aScreen: { ko: '노트북 화면 읽기', en: 'Read the laptop screen' },
  aTv: { ko: 'TV 편성표 보기', en: 'See the TV schedule' },
  aShelf: { ko: '책장 보기', en: 'Look at the bookshelf' },
  noteDlg: { ko: '오늘의 포스트잇', en: "Today's sticky note" },
  screenDlg: { ko: '노트북 화면', en: 'Laptop screen' },
  shelfDlg: { ko: '책장', en: 'Bookshelf' },
  tvDlg: { ko: '고양.방송', en: 'GBS' },
  hint: { ko: '강고양이 씨를 톡 건드려 보세요. 너무 자주는 말고요. 문의 노란 쪽지, 노트북, TV, 책장의 책도 눌러볼 수 있어요.', en: 'Give Kitty Kang a little tap. Just not too often. You can also tap the yellow note on the door, the laptop, the TV and the books on the shelf.' },
  bShelf: { ko: '책장', en: 'Bookshelf' },
  soundOn: { ko: '소리 켜기', en: 'Sound on' },
  soundOff: { ko: '소리 끄기', en: 'Sound off' },
  bFull: { ko: '전체 화면', en: 'Full screen' },
  bDev: { ko: '미리보기 도구', en: 'Preview tools' },
  langAria: { ko: '언어: 한국어. 눌러서 영어로', en: 'Language: English. Tap for Korean' },
  bAwake: { ko: '켜 두기', en: 'Keep awake' },
  bAwakeTip: { ko: '켜 둔 동안 화면이 꺼지지 않아요', en: 'Keeps the screen on while this room is open' },
  bAwakeCharge: { ko: '충전 중일 때만 화면을 켜 둬요', en: 'Keeps the screen on only while charging' },
  aOdd: { ko: '책장의 처음 보는 책 펼치기', en: 'Open the unfamiliar book on the shelf' },
  portraitHint: { ko: '가로로 보면 방이 더 넓게 보여요', en: 'Turn sideways to see more of the room' },
  /* ── 이상한 책: 이 방을 데려가는 법 (MOBILE_PLAN.md 4-3) ── */
  oddTag: { ko: '처음 보는 책', en: 'An unfamiliar book' },
  oddDlg: { ko: '처음 보는 책', en: 'An unfamiliar book' },
  oddTitle: { ko: '이 방을 데려가는 법', en: 'How to Take This Room With You' },
  oddIntro: { ko: '이 책을 펼친 사람은 이 방을 주머니에 넣어 다닐 수 있다. 방법은 간단하다.', en: 'Whoever opens this book may carry this room in their pocket. It is quite simple.' },
  oddIOS: { ko: ['아래(또는 위) 막대의 공유 버튼 {share} 을 누른다.', '목록에서 「홈 화면에 추가」를 고른다.', '홈 화면의 강고양이 씨를 누르면, 이 방이 열린다.'],
    en: ['Tap the Share button {share} in the toolbar.', 'Choose “Add to Home Screen”.', 'Tap Kitty Kang on your home screen, and the room opens.'] },
  oddAndroid: { ko: '아래 버튼을 누르면 홈 화면에 강고양이 씨가 생긴다. 누르면 언제든 이 방이 열린다.', en: 'Press the button below and Kitty Kang appears on your home screen. Tap it any time to open this room.' },
  oddDesktop: { ko: '아래 버튼을 누르면 이 방을 앱처럼 따로 띄울 수 있다. 폰에서 열면 홈 화면에도 둘 수 있다.', en: 'Press the button below to keep this room as its own app. On a phone, you can put it on your home screen.' },
  oddTake: { ko: '홈 화면에 두기', en: 'Put it on my home screen' },
  oddAndroidMenu: { ko: ['브라우저 메뉴 ⋮ 를 연다.', '「홈 화면에 추가」(또는 「앱 설치」)를 누른다.', '홈 화면의 강고양이 씨를 누르면, 이 방이 열린다.'],
    en: ['Open the browser menu ⋮.', 'Tap “Add to Home screen” (or “Install app”).', 'Tap Kitty Kang on your home screen, and the room opens.'] },
  oddInApp: { ko: '이 책은 {browser}에서만 읽을 수 있어요.', en: 'This book can only be read in {browser}.' },
  oddInAppHow: { ko: '메뉴(⋮ 또는 ···)에서 「다른 브라우저로 열기」를 눌러 보세요.', en: 'Look for “Open in browser” in the menu (⋮ or ···).' },
  oddPhone: { ko: '폰에서 열면 홈 화면에 둘 수 있어요.', en: 'Open this on your phone to keep it on your home screen.' },
  oddDone: { ko: '방을 데려갔다. 이제 이 책은 필요 없을 것이다.', en: 'The room is yours now. You will not need this book anymore.' },
  oddClose: { ko: '책 덮기', en: 'Close the book' },
  dOdd: { ko: '이상한 책', en: 'Odd book' },
  /* ── 미리보기 도구 ── */
  devFlow: { ko: '시간 흐름', en: 'Time flow' },
  sp1: { ko: '실시간', en: 'Real time' },
  sp60: { ko: '1분 = 1시간', en: '1 min = 1 hour' },
  sp1440: { ko: '1분 = 하루', en: '1 min = 1 day' },
  devHour: { ko: '시각', en: 'Time' },
  devDay: { ko: '요일', en: 'Day' },
  dayNext: { ko: '다음 날로', en: 'Next day' },
  devCall: { ko: '불러오기', en: 'Summon' },
  dMouse: { ko: '쥐야쥐', en: 'Mousey' },
  dBfly: { ko: '나비', en: 'Butterfly' },
  dMan: { ko: '만득 씨', en: 'Mandeuk' },
  dRain: { ko: '비', en: 'Rain' },
  dBox: { ko: '택배 상자', en: 'Parcel box' },
  dSecret: { ko: '노트북', en: 'Laptop' },
  dKnock: { ko: '컵 툭', en: 'Knock cup' },
  dUfo: { ko: 'UFO', en: 'UFO' },
  dTv: { ko: 'TV 사건', en: 'TV event' },
  dSeason: { ko: '계절', en: 'Season' },
  dXmas: { ko: '크리스마스', en: 'Christmas' },
  dSanta: { ko: '산타', en: 'Santa' },
  dHw: { ko: '할로윈', en: 'Halloween' },
  dBat: { ko: '박쥐', en: 'Bats' },
  dWitch: { ko: '마녀', en: 'Witch' },
  dGhost: { ko: '유령', en: 'Ghost' },
  devHw: { ko: '(할로윈 주간)', en: '(Halloween week)' },
  devAtWork: { ko: '(만득 씨는 지금 회사에 있어요)', en: '(Mandeuk is at work right now)' },
  devSeason: { ko: '({season})', en: '({season})' },
  devRealSeason: { ko: '(실제 계절)', en: '(real season)' },
  devXmas: { ko: '(크리스마스 시즌)', en: '(Christmas season)' },
  devRealDate: { ko: '(실제 날짜)', en: '(real date)' },
  devNoUfo: { ko: '(만득 씨가 있을 땐 오지 않아요)', en: "(It won't come while Mandeuk is around)" },
  devNoProg: { ko: '(지금은 방송 사이예요. 시각을 옮겨 보세요)', en: '(Between shows right now. Try moving the clock)' },
  /* ── 상단 상태 ── */
  dow: { ko: ['일', '월', '화', '수', '목', '금', '토'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
  clock: { ko: '{dow}요일 {ap} {h}:{m}', en: '{dow} {h}:{m} {ap}' },
  am: { ko: '오전', en: 'AM' },
  pm: { ko: '오후', en: 'PM' },
  season: { ko: { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' }, en: { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' } },
  rain: { ko: '비', en: 'rain' },
  stAsleep: { ko: '만득 씨 자는 중', en: 'Mandeuk asleep' },
  stWork: { ko: '만득 씨 출근', en: 'Mandeuk at work' },
  stHome: { ko: '만득 씨 집에 있음', en: 'Mandeuk at home' },
  /* ── 자막(소리) ── */
  capLeave: { ko: '(현관에서) 다녀올게~', en: '(from the front door) Off to work~' },
  capAmbient: { ko: ['…TV 소리…', '…설거지 소리…', '…통화 중: 네네~ 엄마…', '…청소기 소리…'], en: ['…TV noises…', '…dishes clinking…', '…on the phone: yes, yes, Mum…', '…vacuum cleaner…'] },
  capSteps: { ko: '뚜벅 뚜벅…', en: 'step… step…' },
  capSlipper: { ko: '어? 슬리퍼 한 짝 어디 갔지…', en: "Huh? Where'd my other slipper go…" },
  capTvOn: { ko: '…탁.', en: '…click.' },
  capBeep: { ko: '…삐—…', en: '…beeeep…' },
  capGhost: { ko: '…스르륵…', en: '…swish…' },
  /* ── 김만득 씨 ── */
  manduk: {
    ko: { feed: [['밥 먹자~', '천천히 먹어'], ['고양아 밥~', '많이 먹어라']], noise: [['아 왜~ 또 뭐 깼어?', '강고양이!!']], quiet: [['...뭐야, 조용하네']],
      ret: [['다녀왔다~', '고양아~ 잘 있었어?']], lights: [['불 끈다~', '잘 자라 고양아']], check: [['뭐 하냐~', '고양아~'], ['물 마셨어?', '그래그래'], ['어디 있나~', '거기 있었구나']],
      night: [['자다 깼잖아…', '강고양이…']], anniv: [['오늘 너 우리 집 온 날이다.', '간식!']], leave: [['다녀올게~']] },
    en: { feed: [['Dinner time~', 'Slow down, buddy'], ['Food, kitty~', 'Eat up']], noise: [['Ugh, what did you break now?', 'KITTY KANG!!']], quiet: [['...huh, so quiet']],
      ret: [["I'm home~", 'Hey kitty~ were you good?']], lights: [['Lights out~', 'Night night, kitty']], check: [["Whatcha doing~", 'Hey kitty~'], ['Had some water?', 'Good, good'], ['Where are you~', 'Oh, there you are']],
      night: [['You woke me up…', 'Kitty Kang…']], anniv: [['Today is the day you came home.', 'Treats!']], leave: [['Off to work~']] }
  },
  mandukKeyboard: { ko: '또 키보드 밟았네', en: 'Stepped on the keyboard again' },
  /* ── 포스트잇 ── */
  notes: {
    ko: ['고양이 밥 줌 8시', '택배 상자 버리지 말 것\n(고양이가 씀)', '츄르 사기', '요즘 상자에 구멍이 났네?', '치즈가 조금씩 없어진다.\n고양아 너지?', '벽 쪽에서 사각사각 소리.\n집이 낡았나', '모래 갈기', '고양이 발톱 깎기 (도전)', '햇빛 드는 자리 비워둘 것', '고양이가 나를 보고 하품함.\n무슨 뜻이지', '노트북 덮어 두기', '빵 봉지에 작은 구멍…\n고양이 이빨이 이렇게 작았나', '휴지 사기', '슬리퍼 한 짝 또 없어짐', '나비 들어오면 창문 닫기?\n(고양이가 좋아함. 그냥 둠)'],
    en: ['fed cat, 8:00', "don't throw out the box\n(written by cat)", 'buy treat sticks', 'box has a hole in it lately?', 'cheese keeps disappearing.\nwas it you, cat?', 'scritch-scratch in the wall.\nold house?', 'change litter', "trim cat's claws (attempt)", 'keep the sunny spot clear', 'cat looked at me and yawned.\nwhat does that mean', 'close the laptop', 'tiny hole in the bread bag…\nare cat teeth that small?', 'buy tissues', 'lost one slipper. again', 'close window if butterflies get in?\n(cat likes them. leaving it)']
  },
  noteAnniv: { ko: '오늘은 강고양이 온 날!\n간식 챙기기', en: "it's Kitty Kang's day!\ndon't forget treats" },
  noteLaptop: { ko: '노트북 덮어 두기!!\n(또 밟음)', en: 'CLOSE THE LAPTOP!!\n(stepped on it again)' },
  noteRain: { ko: '우산 챙기기', en: 'take umbrella' },
  noteOddHint: { ko: '책장에 처음 보는 책이 꽂혀 있다.\n내가 꽂은 거 아님.', en: "there's a book on the shelf\nI've never seen. not mine." },
  noteSign: { ko: '— 김만득', en: '— Mandeuk' },
  /* ── 노트북 ── */
  blankScreen: { ko: '(빈 화면)', en: '(blank screen)' },
  laptopMess: { ko: ['ㅁㅁㅁㅁㅁㅁㅁㅁ', 'ㅠㅠㅠㅠㅠ;;;;;;;;', 'fffffffffffffff', 'ㅇㅇㅇㅇㅇㅇ\\\\\\\\', 'zzzzzzzzzzzzzzzz', 'ㅎㅎㅎㅎㅎㅎㅎ======', 'ㅁㅁㅁ;;;;;;;;;;;;;;;;;'],
    en: ['aaaaaaaaaaaa', 'jjjjjjj;;;;;;;;', 'fffffffffffffff', 'kkkkkkk\\\\\\\\', 'zzzzzzzzzzzzzzzz', 'hhhhhhhhh======', 'asdf;;;;;;;;;;;;;;;;'] },
  laptopReal: { ko: ['∇·E = ρ/ε₀', 'while (!bowl.full) { wait(); }', 'argmax(낮잠) = 햇빛', 'e^{iπ} + 1 = 0', 'if (만득.home) return 고양이();', 'sum(츄르) → ∞', 'P(쥐야쥐 잡힘) = 0'],
    en: ['∇·E = ρ/ε₀', 'while (!bowl.full) { wait(); }', 'argmax(nap) = sunlight', 'e^{iπ} + 1 = 0', 'if (mandeuk.home) return cat();', 'sum(treats) → ∞', 'P(mousey caught) = 0'] },
  tunaSearch: { ko: '참치캔 대량 구매', en: 'bulk tuna cans' },
  /* ── 생일 ── */
  bdayBanner: { ko: '{name}님, 생일 축하해요!', en: 'Happy birthday, {name}!' },
  bdayBannerNoName: { ko: '생일 축하해요!', en: 'Happy birthday!' },
  bdayLaptop: { ko: '🎂 {name}님 생일을 축하합니다. 🎉', en: '🎂 Happy birthday, {name}! 🎉' },
  bdayDefaultName: { ko: '김만득', en: 'Mandeuk' },
  bdayTv: { ko: '🎂 축하 방송 · {name}님 생일 축하해요', en: '🎂 Special broadcast · Happy birthday, {name}' },
  bdayTvNoName: { ko: '🎂 축하 방송 · 생일 축하해요', en: '🎂 Special broadcast · Happy birthday!' },
  /* ── 책장 ── */
  shelfClose: { ko: '책장 닫기', en: 'Close bookshelf' },
  shelfOpen: { ko: '펼치기 →', en: 'Open →' },
  shelfEmpty: { ko: '아직 빈 책이에요.', en: 'This book is still empty.' },
  shelfPick: { ko: '읽을 책을 골라 보세요.', en: 'Pick a book to read.' },
  /* ── TV: 프로그램 ── */
  tvNews: { ko: '고양 뉴스', en: 'Goyang News' },
  tvBreaking: { ko: '속보: 츄르 가격 인상', en: 'BREAKING: treat stick prices up' },
  tvTicker: { ko: ['오늘의 날씨: 낮잠 자기 좋음', '츄르 시세 소폭 상승', '창밖 새 관측 3마리', '택배 상자 품귀 현상 계속', '해 드는 자리 만석', '쥐 목격담 또 나와… 당국은 부인'],
    en: ["Today's weather: perfect for naps", 'Treat stick prices edge up', '3 birds spotted outside the window', 'Parcel box shortage continues', 'All sunny spots fully booked', 'Another mouse sighting… officials deny'] },
  tvDrama: { ko: '드라마 「창가에서」', en: 'By the Window' },
  tvDramaTurn: { ko: '…흥.', en: '…hmph.' },
  tvDramaNose: { ko: '…냥.', en: '…meow.' },
  tvDramaNext: { ko: '다음 이 시간에', en: 'To be continued' },
  tvDramaSubs: { ko: ['…냥.', '…냐앙.', '(창밖을 본다)', '그때 그 상자, 기억해?', '…츄르 때문이야?', '(꼬리를 탁 친다)'],
    en: ['…meow.', '…mrrow.', '(looks out the window)', 'That box back then… remember?', '…is this about the treats?', '(flicks tail)'] },
  tvBaseball: { ko: '고양이 프로야구', en: 'Cat Pro Baseball' },
  tvBaseballTeams: { ko: ['냥', '묘'], en: ['Meows', 'Purrs'] },
  tvBaseballChase: { ko: '공 대신 공을 쫓아갑니다', en: 'Chasing the wrong ball' },
  tvHomerun: { ko: '홈런!', en: 'HOME RUN!' },
  tvSoccer: { ko: '고양이 축구', en: 'Cat Soccer' },
  tvSoccerTeams: { ko: ['털', '실'], en: ['Fur', 'Yarn'] },
  tvSoccerBox: { ko: '경기 중단: 상자 발견', en: 'Match halted: box spotted' },
  tvGoal: { ko: '골!', en: 'GOAL!' },
  tvActress: { ko: '연예가 고양통신', en: 'Meowtertainment Tonight' },
  tvGroom: { ko: '우아하게 그루밍 중', en: 'Grooming, elegantly' },
  tvFlash: { ko: '찰칵!', en: 'Snap!' },
  tvHorror: { ko: '오이 공포 영화', en: 'Cucumber Horror' },
  tvHorrorSpecial: { ko: '🎃 할로윈 특집 「{name}」', en: '🎃 Halloween Special: {name}' },
  tvCreak: { ko: '…끼이익…', en: '…creeeak…' },
  tvCucumber: { ko: '오이다!!!', en: 'CUCUMBER!!!' },
  /* ── TV: 편성 이름 틀 ── */
  tvFirstRun: { ko: '{name} (본방)', en: '{name} (new)' },
  tvRerun: { ko: '{name} (재)', en: '{name} (rerun)' },
  tvMorning: { ko: '아침 {name}', en: 'Morning {name}' },
  tvLate: { ko: '마감 {name}', en: 'Late {name}' },
  tvLive: { ko: '{name} 중계', en: '{name} (live)' },
  /* ── TV: 방송 시작·마침 ── */
  tvChannel: { ko: '고양.방송', en: 'GBS' },
  tvOpening: { ko: '오늘도 방송을 시작합니다', en: "We're on the air. Good morning" },
  tvTestcard: { ko: '고양.방송   화면조정', en: 'GBS   test pattern' },
  tvSignoff: { ko: '오늘 방송을 모두 마쳤습니다. 안녕히 주무세요', en: "That's all for today. Good night" },
  /* ── TV: 편성표 창 ── */
  tvgNow: { ko: '지금 <b>{title}</b> · {s}–{e}', en: 'Now <b>{title}</b> · {s}–{e}' },
  tvgOff: { ko: '지금은 방송을 쉬는 시간이에요. 새벽 5시에 다시 켜져요.', en: "We're off the air. Back on at 5 AM." },
  tvgTestcard: { ko: '화면조정 중', en: 'Test pattern' },
  tvgOpening: { ko: '방송을 시작합니다', en: 'Starting the broadcast' },
  tvgSignoff: { ko: '오늘 방송을 마치는 중', en: "Wrapping up today's broadcast" },
  tvgSignOn: { ko: '방송 시작 · 화면조정과 아침 해', en: 'Sign-on · test pattern and sunrise' },
  tvgSignOff: { ko: '방송 마침 · 화면조정', en: 'Sign-off · test pattern' },
  tvgClose: { ko: 'TV 닫기', en: 'Close TV' },
  tvgScreen: { ko: '지금 TV 화면', en: 'Current TV screen' },
  tvgList: { ko: '오늘 편성표', en: "Today's schedule" },
  tvgFoot: { ko: '고양.방송은 실제 시간에 맞춰 나와요. 새벽 1시부터 5시까지는 쉬어요.', en: 'GBS (Goyang Broadcasting System) runs on real time. Off the air from 1 to 5 AM.' },
};
const pickLang = () => {
  const saved = store.get('lang', null);
  if (saved === 'ko' || saved === 'en')
    return saved;
  const ls = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']);
  return ls.some(l => /^ko\b/i.test(l || '')) ? 'ko' : 'en';
};
export let LANG = pickLang();
export function tr(key, vars) {
  const e = STR[key];
  if (!e) {
    console.warn('i18n: 없는 키', key);
    return key;
  }
  let v = e[LANG] != null ? e[LANG] : e.ko;
  if (vars && typeof v === 'string')
    v = v.replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : m);
  return v;
}
// 책장 책처럼 objects.json에 있는 글자: 영어일 때 o.en[필드]가 있으면 그것
export const tObj = (o, field) => (LANG === 'en' && o.en && o.en[field] != null) ? o.en[field] : o[field];
// HTML 라벨 채우기
export function applyDom() {
  const h = document.documentElement;
  h.lang = LANG;
  document.title = tr('title');
  const md = document.querySelector('meta[name="description"]');
  if (md)
    md.setAttribute('content', tr('metaDesc'));
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = tr(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-html]').forEach(el => el.innerHTML = tr(el.dataset.i18nHtml));
  document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', tr(el.dataset.i18nAria)));
  const b = document.getElementById('bLang');
  if (b) {
    b.innerHTML = LANG === 'ko' ? '<b>KO</b> / EN' : 'KO / <b>EN</b>';
    b.setAttribute('aria-label', tr('langAria'));
  }
}
// 언어 바꾸기: 저장 → 글꼴 → HTML → 열려 있는 창은 각자 'langchange'를 듣고 다시 그린다
export function setLang(l) {
  LANG = l === 'en' ? 'en' : 'ko';
  store.set('lang', LANG);
  setHandFont(LANG);
  applyDom();
  window.dispatchEvent(new Event('langchange'));
}
setHandFont(LANG);
