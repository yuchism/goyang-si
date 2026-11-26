/* 쪽지 병 글귀 150개 (BEACH_PLAN.md 5장, tasks/beach-3-bottle.md)
   원본: assets/briefs/beach/notes-draft.md (주인 확정 2026-11-26) — tools/make_beach_notes.py로 다시 만듦. 여기서 직접 고치지 말 것
   [한국어, English]. 순서가 곧 번호(0부터) — 본 것 기록(store beachNote.seen)이 이 번호를 씀. 지울 땐 빈 줄 대신 null */
export const NOTES = [
  ["대답은 이미 당신 주머니에 있다.", "The answer is already in your pocket."], // 1
  ["지금은 아니다. 하지만 머지않았다.", "Not now. But not long."], // 2
  ["잃어버린 것이 당신을 찾고 있다.", "What you lost is looking for you."], // 3
  ["오늘의 바다는 어제의 바다가 아니다.", "Today's sea is not yesterday's sea."], // 4
  ["서두르지 마라. 조개도 천천히 열린다.", "Don't hurry. Even shells open slowly."], // 5
  ["그 사람도 같은 생각을 하고 있다.", "They are thinking the same thing."], // 6
  ["당신이 피한 길이 당신을 기다린다.", "The road you avoided is waiting for you."], // 7
  ["세 번째에 알게 된다.", "You will know on the third time."], // 8
  ["문은 안에서 열린다.", "The door opens from the inside."], // 9
  ["작은 것이 큰 것을 데려온다.", "Something small brings something big."], // 10
  ["이름을 부르면 온다.", "Call it by name and it will come."], // 11
  ["바람이 바뀌는 날을 기억하라.", "Remember the day the wind changes."], // 12
  ["이미 시작되었다.", "It has already begun."], // 13
  ["늦은 것이 아니라 아직인 것이다.", "It isn't late. It's not yet."], // 14
  ["웃음 뒤에 열쇠가 있다.", "There is a key behind the laughter."], // 15
  ["내려놓으면 가벼워진다. 무엇을, 인지는 당신이 안다.", "Put it down and you'll be lighter. You know what."], // 16
  ["누군가 당신 이야기를 좋게 하고 있다.", "Someone is speaking kindly of you."], // 17
  ["물은 결국 바다로 간다.", "Water finds the sea in the end."], // 18
  ["거꾸로 읽어 보라.", "Read it backwards."], // 19
  ["다음 비가 그치면.", "When the next rain stops."], // 20
  ["그것은 생각보다 가까이 있다.", "It is closer than you think."], // 21
  ["두 갈래 중 덜 반짝이는 쪽.", "Of the two, the one that shines less."], // 22
  ["오래된 편지를 다시 열어 보라.", "Open an old letter again."], // 23
  ["조용한 사람이 답을 쥐고 있다.", "The quiet one holds the answer."], // 24
  ["모래 위의 글씨처럼, 그래도 괜찮다.", "Like words on sand — and that's all right."], // 25
  ["당신은 이미 한 번 해냈다.", "You have done this once before."], // 26
  ["밤이 길수록 아침은 분명하다.", "The longer the night, the surer the morning."], // 27
  ["그 질문은 잠시 접어 두어라.", "Fold that question away for a while."], // 28
  ["돌아보면 보인다.", "Look back and you will see."], // 29
  ["빈자리에는 이유가 있다.", "An empty seat has its reasons."], // 30
  ["첫 마음이 맞았다.", "Your first feeling was right."], // 31
  ["한 걸음이면 충분하다.", "One step is enough."], // 32
  ["닫힌 것은 닫힌 대로 두어라.", "Leave what is closed, closed."], // 33
  ["기다리던 소식은 다른 모습으로 온다.", "The news you wait for comes in another shape."], // 34
  ["당신의 그림자가 먼저 알고 있다.", "Your shadow already knows."], // 35
  ["계절이 한 번 바뀌면.", "When the season turns once."], // 36
  ["잊은 줄 알았던 것이 떠오를 것이다.", "Something you thought you forgot will surface."], // 37
  ["그 사람에게 먼저 인사하라.", "Say hello first."], // 38
  ["손에 쥔 것을 세어 보라. 생각보다 많다.", "Count what you hold. It's more than you think."], // 39
  ["바다는 묻지 않는다. 그저 돌려준다.", "The sea doesn't ask. It only returns."], // 40
  ["오늘 본 숫자를 기억하라.", "Remember a number you see today."], // 41
  ["아니라고 말해도 된다.", "You may say no."], // 42
  ["길을 잃은 것이 아니라 돌아가는 중이다.", "You're not lost. You're taking the long way."], // 43
  ["그것은 끝이 아니라 접힌 자리다.", "It's not an end, it's a fold."], // 44
  ["누군가 당신을 위해 불을 켜 두었다.", "Someone left a light on for you."], // 45
  ["무거운 것은 나누면 가볍다.", "Heavy things grow light when shared."], // 46
  ["새가 먼저 안다.", "The birds know first."], // 47
  ["아직 쓰지 않은 페이지가 더 많다.", "There are more blank pages than written ones."], // 48
  ["세 사람 중 한 사람.", "One of the three."], // 49
  ["당신이 버린 것이 누군가의 보물이 된다.", "What you let go becomes someone's treasure."], // 50
  ["오래 걸리는 것은 오래 간다.", "What takes long, lasts long."], // 51
  ["답은 질문보다 짧다.", "The answer is shorter than the question."], // 52
  ["지금 떠오른 그 얼굴.", "The face that just came to mind."], // 53
  ["같은 꿈을 두 번 꾸게 된다.", "You will dream the same dream twice."], // 54
  ["파도는 돌아온다. 당신의 것도.", "Waves come back. So will yours."], // 55
  ["가장 작은 목소리에 귀 기울여라.", "Listen to the smallest voice."], // 56
  ["그 일은 당신 탓이 아니었다.", "It was not your fault."], // 57
  ["달이 다시 찰 때쯤.", "Around the time the moon is full again."], // 58
  ["놓친 기차가 당신을 살렸다.", "The train you missed saved you."], // 59
  ["당신이 찾는 것도 당신을 찾는다.", "What you seek is seeking you."], // 60
  ["창문을 열어라. 말 그대로.", "Open a window. Literally."], // 61
  ["모르는 척해도 된다. 잠시만.", "You may pretend not to know. For a while."], // 62
  ["이미 충분히 멀리 왔다.", "You have come far enough already."], // 63
  ["빛은 틈으로 들어온다.", "Light comes in through the cracks."], // 64
  ["당신의 오래된 물건 하나가 답을 안다.", "One of your old things knows the answer."], // 65
  ["조금 더 바보 같아져도 좋다.", "It's fine to be a little more foolish."], // 66
  ["다음 모퉁이를 돌면.", "Around the next corner."], // 67
  ["그 사람은 당신을 기억한다.", "That person remembers you."], // 68
  ["거절은 방향을 알려 줄 뿐이다.", "A no only points the way."], // 69
  ["아직 이름 붙이지 마라.", "Don't name it yet."], // 70
  ["따뜻한 것을 마셔라. 그다음에 정하라.", "Drink something warm. Then decide."], // 71
  ["당신의 발이 먼저 길을 안다.", "Your feet know the way first."], // 72
  ["썰물에 드러나는 것이 있다.", "Some things show at low tide."], // 73
  ["같은 하늘 아래 있다.", "You are under the same sky."], // 74
  ["마음이 두 번 기울면 그쪽이다.", "If your heart leans twice, that's the way."], // 75
  ["오늘은 묻지 말고 들어라.", "Today, don't ask. Listen."], // 76
  ["끝까지 듣지 않은 노래가 있다.", "There's a song you never heard to the end."], // 77
  ["잠든 씨앗도 자라는 중이다.", "A sleeping seed is still growing."], // 78
  ["당신을 닮은 사람이 곧 나타난다.", "Someone like you will appear soon."], // 79
  ["고칠 수 있다. 생각보다 쉽게.", "It can be fixed. More easily than you think."], // 80
  ["별은 낮에도 있다.", "The stars are there in the daytime too."], // 81
  ["내일의 당신이 고맙다고 한다.", "Tomorrow's you says thank you."], // 82
  ["빈손으로 가도 된다.", "You may go empty-handed."], // 83
  ["오래된 노래 속에 단서가 있다.", "There is a clue in an old song."], // 84
  ["문득 보낸 짧은 말 한 줄.", "A short message, sent on a whim."], // 85
  ["기다림도 대답이다.", "Waiting is also an answer."], // 86
  ["가장 늦게 핀 꽃이 가장 오래 간다.", "The latest flower lasts the longest."], // 87
  ["그날의 날씨를 기억하라.", "Remember the weather that day."], // 88
  ["당신은 생각보다 사랑받는다.", "You are loved more than you know."], // 89
  ["아무도 모르는 쪽이 맞다.", "The way nobody knows is the right one."], // 90
  ["세 번 숨 쉬고 다시 보라.", "Breathe three times and look again."], // 91
  ["바다 건너에서 소식이 온다.", "News comes from across the sea."], // 92
  ["그것은 사라지지 않았다. 자리를 옮겼을 뿐.", "It didn't disappear. It only moved."], // 93
  ["지금 들리는 소리를 믿어라.", "Trust the sound you hear right now."], // 94
  ["반쯤 왔다.", "You're halfway there."], // 95
  ["해가 지는 쪽에 답이 있다.", "The answer lies where the sun sets."], // 96
  ["당신이 잊은 약속이 아직 유효하다.", "A promise you forgot still holds."], // 97
  ["오늘 만난 우연은 우연이 아니다.", "Today's coincidence is no coincidence."], // 98
  ["쪽지를 접어 주머니에 넣어라. 나중에 안다.", "Fold this note into your pocket. You'll know later."], // 99
  ["다시 병을 띄울 날이 온다.", "A day will come to set a bottle adrift again."], // 100
  ["모든 것에는 제 계절이 있다. 지금은 기다리는 계절이다.", "Everything has its season. This one is for waiting."], // 101
  ["강은 바다를 채우지 못해도 쉬지 않고 흐른다.", "Rivers never fill the sea, and still they flow."], // 102
  ["가장 깊은 물이 가장 조용하다.", "The deepest water is the quietest."], // 103
  ["오늘 심은 것은 오늘 보이지 않는다.", "What you plant today won't show today."], // 104
  ["말을 아낀 날이 오래 남는다.", "The days you spoke less are the ones that stay."], // 105
  ["바람을 세는 자는 씨를 뿌리지 못한다.", "Whoever counts the wind never sows."], // 106
  ["웃는 날도 우는 날도 지나간다. 그래서 둘 다 귀하다.", "Laughing days and crying days both pass. That's why both are precious."], // 107
  ["높이 오른 해도 결국 바다에 눕는다.", "Even the highest sun lies down in the sea."], // 108
  ["빈 그릇이 가장 많이 담는다.", "An empty bowl holds the most."], // 109
  ["당신이 내일을 모르듯, 내일도 당신을 모른다. 그러니 놀라게 하라.", "You don't know tomorrow, and it doesn't know you. So surprise it."], // 110
  ["부드러운 대답이 단단한 문을 연다.", "A soft answer opens a hard door."], // 111
  ["오래 본 것은 다시 보아야 보인다.", "What you have long looked at must be seen again."], // 112
  ["해 아래 새것은 없다. 하지만 당신의 눈은 새것이다.", "Nothing is new under the sun. But your eyes are."], // 113
  ["친구의 상처는 적의 칭찬보다 낫다.", "A friend's wound is better than a stranger's praise."], // 114
  ["기억이 흐려지는 것은 자리를 내주기 위해서다.", "Memories fade to make room."], // 115
  ["오늘 잃은 것이 내일 이름을 바꿔 돌아온다.", "What you lose today returns tomorrow under another name."], // 116
  ["쉬는 것도 일이다.", "Resting is work too."], // 117
  ["지나간 날을 더 좋았다 하지 마라. 그날도 오늘이었다.", "Don't say the old days were better. They were today once."], // 118
  ["등불은 멀리 비추지 않아도 된다. 발밑이면 충분하다.", "A lamp needn't shine far. Your feet are enough."], // 119
  ["가장 먼 길이 집으로 가는 길이기도 하다.", "The longest road can be the road home."], // 120
  ["같은 강물에 두 번 발을 담글 수 없다. 그래서 오늘이 있다.", "You can't step in the same river twice. That's why there is today."], // 121
  ["닻을 올리는 날이 온다. 서두르지 않아도.", "The day to lift anchor will come, without hurrying."], // 122
  ["조개 속의 모래가 진주가 된다.", "The grain of sand in the shell becomes the pearl."], // 123
  ["당신이 건넨 작은 친절이 아직 떠다니고 있다.", "A small kindness you gave is still drifting somewhere."], // 124
  ["잠이 모자란 밤에는 결정하지 마라.", "Don't decide on a sleepless night."], // 125
  ["너무 많은 지도가 길을 잃게 한다.", "Too many maps will get you lost."], // 126
  ["별은 서로 닿지 않아도 같은 밤을 만든다.", "Stars never touch, yet they make the same night."], // 127
  ["해야 할 말은 짧다. 하고 싶은 말이 길 뿐.", "What must be said is short. Only what you want to say is long."], // 128
  ["바다는 매일 모래 위의 글씨를 지운다. 그래도 사람들은 쓴다.", "The sea erases words on sand every day. People keep writing."], // 129
  ["비어 있는 날이 다음을 채운다.", "An empty day fills the next."], // 130
  ["당신을 붙잡는 것이 당신을 지키기도 한다.", "What holds you back may also hold you safe."], // 131
  ["처음 간 길은 언제나 길다. 돌아올 땐 짧다.", "A new road is always long. The way back is short."], // 132
  ["모든 문이 열릴 필요는 없다.", "Not every door needs to open."], // 133
  ["오늘은 남의 정원을 들여다보지 마라.", "Today, don't look into other people's gardens."], // 134
  ["지혜는 대개 늦게 도착한다. 그래도 온다.", "Wisdom usually arrives late. But it arrives."], // 135
  ["넘어진 자리에서 보이는 것이 있다.", "Some things can only be seen from where you fell."], // 136
  ["가벼운 짐이 먼 길을 간다.", "Light baggage travels far."], // 137
  ["하늘을 나는 새도 내려앉을 가지가 필요하다.", "Even flying birds need a branch to land on."], // 138
  ["그 사람의 침묵에도 말이 있다.", "There are words in their silence too."], // 139
  ["오늘의 물음은 내일의 대답에게 맡겨라.", "Leave today's question to tomorrow's answer."], // 140
  ["찾던 것은 찾기를 멈출 때 나타난다.", "What you seek appears when you stop seeking."], // 141
  ["노을은 매일 다르다. 당신도 그렇다.", "No two sunsets are the same. Nor are you."], // 142
  ["작은 불씨 하나가 긴 밤을 버틴다.", "One small ember lasts the long night."], // 143
  ["생각보다 많은 사람이 당신을 응원한다.", "More people are rooting for you than you think."], // 144
  ["무엇이든 끝은 처음보다 낫다.", "The end of a thing is better than its beginning."], // 145
  ["오래된 다리는 아직 튼튼하다.", "The old bridge is still strong."], // 146
  ["소금이 녹아야 바다가 된다.", "Salt must dissolve to become the sea."], // 147
  ["그 일은 당신이 생각한 만큼 무겁지 않다.", "It isn't as heavy as you think."], // 148
  ["반대편 해안에서도 누군가 병을 띄운다.", "On the far shore, someone is setting a bottle adrift too."], // 149
  ["이 쪽지를 읽는 지금이 그때다.", "Now, as you read this, is the time."], // 150
];
