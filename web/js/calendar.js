/* 달력 한 장: 기간과 특별한 순간 (TIME_BASE_PLAN.md 8장). 방·창밖·TV가 모두 이 표를 본다.
   데이터만 둔다. 다른 모듈을 불러오지 않는다 (함수는 모두 time.js: inPeriod·periodsAt·momentNow·onDate·holiday)
   - 날짜는 'MM-DD'. dates: 그해 명절의 양력 날짜, before/after: 그 앞뒤 며칠까지
   - through: 'night' → to 날짜에서 끝나지 않고 그날 밤이 끝날 때(다음 날 동틀 녘 끝)까지. TV는 이것을 보지 않는다(방송일 날짜만)
   - 순간 night: true → date의 from 시각부터 그 밤이 끝날 때까지
   새 기간은 여기 한 줄. TV 특집에 쓰려면 r/tv/schedule.json periods에 { "period": "이름" } */
export const CAL = {
  periods: {
    halloween:     { from: '10-24', to: '10-31', through: 'night' }, // 10/24 ~ 10/31 밤이 끝날 때(11/1 동틀 녘)
    christmas:     { from: '12-14', to: '12-26' },                   // 크리스마스 시즌: 방의 트리, 창밖 산타
    christmasDays: { from: '12-24', to: '12-25' },                   // 이브·당일: TV 크리스마스 특집
    newyearsEve:   { date: '12-31' },
    newyear:       { date: '01-01' },
    catDay:        { date: '09-09' },
    seollal: { dates: { 2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13', 2030: '02-03' }, before: 1, after: 1 },
    chuseok: { dates: { 2026: '09-25', 2027: '09-15', 2028: '10-03', 2029: '09-22', 2030: '09-12' }, before: 1, after: 1 }
  },
  moments: {
    halloweenNight:    { date: '10-31', from: '21:00', night: true }, // 10/31 밤 마녀 꼭 한 번
    christmasEveNight: { date: '12-24', from: '21:00', night: true }  // 이브 밤 산타 꼭 한 번
  },
  // 창밖 작업이 쓸 자리 (이번엔 자리만, 아직 아무도 읽지 않는다)
  later: {
    meteorPeaks: ['01-03', '08-12', '10-21', '11-17', '12-13'] // 유성우 극대 무렵
  }
};
