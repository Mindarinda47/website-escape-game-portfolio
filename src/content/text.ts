// 사용자 편집용 문구 모음입니다. 화면 문구나 게임 대사는 이 파일에서 우선 수정하세요.
export const appText = {
  intro: {
    title: "당신은 웹사이트에 갇혔다.",
    lines: [
      "브라우저의 여러 기능을 활용해 웹사이트 곳곳을 탐색하라.",
      "페이지에 숨은 정보와 단서를 획득하고",
      "이곳을 탈출할 방법을 찾아야 한다.",
    ],
    openButton: "포털 열기",
    help: "주소창과 브라우저 도구, 마우스와 키보드를 자유롭게 사용할 수 있습니다.",
  },
  logoutConfirm: "정말로 로그아웃 하시겠습니까?",
  yes: "예",
  no: "아니오",
  ending: {
    lines: [
      "당신은 탈출에 성공하였습니다.",
      "어떠셨나요? 짧지만 즐거우셨나요?",
      "플레이해주셔서 감사합니다.",
    ],
    restartButton: "다시 하기",
  },
} as const;

export const browserText = {
  reset: {
    title: "진행을 초기화할까요?",
    description: "방문 기록, 아이템, 문자 단서와 페이지 진행이 모두 처음 상태로 돌아갑니다.",
    confirm: "초기화",
    cancel: "취소",
  },
} as const;

export const inventoryText = {
  title: "인벤토리",
  itemsTitle: "사용 아이템",
  lettersTitle: "문자 단서",
  hintsTitle: "발견한 힌트",
  water: "생수",
  key: "고대 열쇠",
  points: "보유 포인트",
  stored: "보관 중",
  used: "사용됨",
} as const;

export const adventureText = {
  scenes: {
    village: { title: "새벽바람 마을", objective: "마을을 둘러보고 동쪽 길로 나가 보자." },
    world: { title: "바람결 초원", objective: "숲과 초원을 가로질러 마을, 동굴, 성으로 이어진 길을 찾아보자." },
    dungeon: { title: "메아리 동굴", objective: "굽이치는 동굴을 탐색하며 마물과 맞서자." },
    "castle-1": { title: "칠흑 성 · 1층", objective: "무너진 대연회장을 지나 위층 계단을 찾아가자." },
    "castle-2": { title: "칠흑 성 · 2층", objective: "긴 회랑을 돌파해 왕좌의 방으로 향하자." },
    boss: { title: "왕좌의 방", objective: "성의 주인을 쓰러뜨리고 봉인된 문을 열자." },
    secret: { title: "이름 없는 숲", objective: "숲 가장 깊은 곳에서 희미한 문자의 기척이 느껴진다." },
    rescue: { title: "숨겨진 방", objective: "숨겨진 방의 끝에서 누군가 기다리고 있다." },
    clear: { title: "모험 완료", objective: "전설의 G를 획득했다!" },
  },
  prompt: { talk: "E : 대화하기", recover: "E : 회복하기", acquire: "E : 획득하기", open: "E : 열기", inspect: "E : 조사한다", continue: "E : 계속" },
  controls: { move: "이동", attack: "검 공격", interact: "대화/조사", pause: "일시정지", continue: "계속" },
  enemies: { melee: "동굴 박쥐", ranged: "스컬" },
  equipment: { oldSword: "낡은 검", greatSword: "굉장한 검", greatSwordObtained: "굉장한 검을 얻었다!" },
  gate: {
    level: "들어가기엔 아직 위험한 곳이다.",
    sword: "봉인이 걸려 있다. 마을의 누군가에게 상담해볼까...",
  },
  battle: {
    bossApproach: "왕좌 앞에서 묵직한 숨소리가 들린다.",
    bossCollapse: "드래곤의 형체가 붕괴하기 시작한다.",
    passageOpened: "폭발이 잦아들고 왕좌 뒤편의 숨겨진 통로가 열렸다.",
    passageToast: "왕좌 뒤편에서 숨겨진 통로가 열렸습니다.",
    damaged: "공격을 받았다. 잠시 몸이 빛나는 동안에는 피해를 받지 않는다.",
    defeated: "눈앞이 흐려지며 마을 우물가로 돌아간다.",
    respawn: "동굴 깊은 곳에서 새로운 마물의 기척이 들린다.",
    reward: (name: string, exp: number, gold: number) => `${name} 격파 · EXP +${exp} · ${gold}G`,
  },
  npc: {
    blacksmithOwned: "대장장이: 그 검이라면 칠흑 성의 봉인을 풀 수 있을 걸세.",
    blacksmithPrice: (gold: number) => `대장장이: 굉장한 검은 45G라네. 자네 주머니엔 ${gold}G가 있군.`,
    fortuneTeller: {
      name: "점술가 할머니",
      intro: "길을 잃었느냐? 질문 하나에 15G란다. 같은 걸 다시 물어도 보수는 다시 받지.",
      insufficientGold: "골드가 모자라구나. 15G를 마련해 다시 오너라.",
      menuGuide: "방향키로 고르고 E를 누르거나, 원하는 질문을 클릭하거라.",
      close: "대화 끝내기",
      options: [
        { label: "첫 번째 단서", answer: "바람결 초원의 남동쪽 끝에는 눈에 잘 띄지 않는 길이 있단다." },
        { label: "두 번째 단서", answer: "쇼핑에는 숨겨진 상품이 있단다. 페이지 안에서 '라스트'를 정확히 찾아보거라." },
        { label: "세 번째 단서", answer: "승부를 맞히고 나면 주소에 유난히 튀는 대문자가 보일 게야. 주소 그 자체를 눌러 보거라." },
        { label: "네 번째 단서", answer: "쇼핑 상점의 카드 상품을 자세히 들여다보거라. 크게 보아야만 드러나는 것도 있는 법이지." },
        { label: "다섯 번째 단서", answer: "칠흑 성의 주인을 쓰러뜨리는 것이 답이 될테지." },
        { label: "여섯 번째 단서", answer: "산불의 불을 끈 뒤에는, 칠흑같은 밤으로 바꾸어 사진을 다시 살펴보거라." },
        { label: "출구", answer: "모든 문자를 알맞게 늘어놓았다면, 처음 마주한 검색창에 그 말을 입력하거라." },
      ],
    },
    well: "맑은 우물물로 체력이 모두 회복되었다.",
    villageSign: [
      "공주가 칠흑의 성에 갇혔습니다. 부디 구해주세요...",
      "참고로 동굴 안쪽에는 보물이 잠들어있습니다.",
    ],
    princessThanks: "공주: 저를 구해 주셔서 정말 고마워요, 용사님.",
    princessGift: "공주: 감사의 뜻으로 왕가에 대대로 내려오는 전설의 G를 드리겠습니다.",
  },
  bossIntro: {
    speaker: "드래곤",
    lines: ["드디어 여기까지 왔군, 용사", "공주와 G는 절대로 넘겨줄 수 없다...", "덤벼라!!"],
  },
  clue: {
    harpToast: "고귀한 유의 하프를 획득했습니다.",
    harpStatus: "고귀한 유의 하프가 맑은 음을 남기고 단서가 되었다.",
    legendaryGToast: "전설의 G를 획득했습니다.",
  },
  treasure: {
    acquiredToast: "보물상자의 힌트가 인벤토리에 추가되었습니다.",
    hints: {
      "shop-last": "쇼핑에는 숨겨진 상품이 있다. 키워드는 '라스트'",
      "news-night": "불을 끈 뒤엔 칠흑같은 밤이 되어야한다.",
    },
  },
} as const;

export const portalText = {
  searchPlaceholder: "검색어를 입력하세요",
  noResults: "검색 결과가 없습니다.",
  newsTitle: "오늘의 뉴스",
  lifestyleTitle: "라이프스타일",
  sportsTitle: "스포츠",
  trendingTitle: "실시간 검색",
  trending: ["유감산 산불", "산불", "강림FC", "도림FC", "항공권", "날씨", "폭염", "화재", "워터파크", "G의 전설"],
  newsBriefs: [
    { category: "사회", title: "취업 준비 길어지는 대한민국 청년들… 첫 경력의 문턱도 높아졌다", time: "18분 전" },
    { category: "문화", title: "밤의 도서관에서 시작된 조용한 전시", time: "32분 전" },
    { category: "생활", title: "창가에 두기 좋은 작은 식물 다섯 가지", time: "1시간 전" },
    { category: "경제", title: "치솟는 임대료에 골목 상점 폐업 늘어… 빈 점포 확산", time: "2시간 전" },
  ],
  headline: {
    category: "새벽일보 · 속보",
    title: "[속보] 유감산 대형산불… “화재 진압에 총동원”",
    summary: "짙은 연기로 가려진 산등성이의 현재 상황을 전합니다.",
  },
  weather: { title: "오늘의 날씨", temperature: "18°", condition: "구름 사이 맑음", note: "오후에는 바람이 조금 잦아듭니다." },
  today: "오늘",
  headlineLabel: "HEADLINE",
  lifeLabel: "LIFE",
  sportsLabel: "SPORTS",
  lifestyleDescription: "오늘 둘러볼 만한 것들",
  sportsDescription: "오늘의 경기와 일정",
  sportsCaption: "경기 전 승부 예측이 진행 중입니다",
  liveChip: "12라운드 · 오늘",
} as const;

export const newsText = {
  header: { kicker: "오늘을 기록합니다", title: "새벽일보", stamp: "오늘 · 아침판" },
  navigation: ["주요 뉴스", "사회", "기후", "문화", "기록"],
  article: {
    category: "기후 · 오늘",
    title: '[속보] 유감산 대형산불..."화재 진압에 총동원"',
    publishedAt: "20XX-08-02 20:25",
    imageAlt: "유감산 능선을 따라 번진 산불 현장",
    burningImageLabel: "불길이 보이는 기사 사진",
    extinguishedImageLabel: "불이 꺼진 기사 사진",
    letterLabel: "사진 속 알파벳 O",
    imageCaption: "유감산 현장 사진 · 오늘",
    body: [
      "유감산 능선을 따라 번진 불길로 인근 탐방로가 통제됐습니다. 진화 인력은 바람이 잦아드는 구간부터 남은 불씨를 확인하고 있으며, 현장 주변에는 짙은 연기가 머물고 있습니다.",
      "관계 당국은 산림 가장자리의 열기가 완전히 식을 때까지 접근을 자제해 달라고 전했습니다. 새벽부터 진화 작업을 이어갔지만 불길과 연기는 멈출 기세가 보이지 않습니다.",
    ],
  },
  relatedTitle: "지금 뜨는 기사",
  relatedTime: "오늘 · 3분 전",
  relatedStories: [
    { tag: "사회", title: "취업 준비 길어지는 대한민국 청년들… 첫 경력 쌓기도 어렵다", excerpt: "경력을 요구하는 공고와 길어진 채용 절차 속에서 사회에 첫발을 내딛으려는 청년들의 대기 시간이 늘고 있다." },
    { tag: "생활", title: "천천히 걷는 사람을 위한 횡단보도 실험", excerpt: "보행 속도에 따라 신호 시간이 달라지는 작은 실험이 도심 세 곳에서 시작됐다." },
    { tag: "문화", title: "국산 기대작 G의 전설... 기다림 끝에 출시!", excerpt: "게임 내 숨겨진 장소에 모두가 원하는 것이 있다는 소문도?!" },
  ],
  toast: {
    extinguished: "생수를 사용했습니다. 불꽃과 연기가 잦아들었습니다.",
    waterNotSelected: "사진 너머의 열기가 손끝에 남는다.",
    noWater: "불길과 연기 때문에 사진의 안쪽이 보이지 않는다.",
    letter: "문자 단서 O를 획득했습니다.",
  },
} as const;

export const shopText = {
  kicker: "오늘을 모으는 상점",
  title: "GOGLE SHOP",
  ranking: "오늘의 랭킹",
  cartEmpty: "장바구니 0",
  notice: "오늘 주문한 상품은 결제 확인 후 순차적으로 발송됩니다.",
  productLabel: (index: number) => `오늘의 상품 ${index}`,
  products: [
    { id: "water", name: "맑은샘 생수 500ml", price: "무료 샘플", description: "휴대하기 편한 500ml 생수입니다. \n차갑게 보관해 산뜻한 상태로 배송됩니다." },
    { id: "card", name: "코레몬 카드 세트", price: "12,000원", description: "엄청난 유행몰이 중인 코레몬 카드 세트입니다. \n불과 물 속성 캐릭터 카드가 함께 들어 있습니다." },
    { id: "console", name: "NOVA X 게임 콘솔", price: "398,000원", description: "빠른 로딩과 정밀한 컨트롤을 지원하는 \n거실형 게임 콘솔입니다. \n무선 컨트롤러 1개가 포함됩니다." },
    { id: "watch", name: "클래식 네이비 손목시계", price: "129,000원", description: "짙은 네이비 다이얼과 가죽 스트랩을 \n조합한 아날로그 손목시계입니다. \n일상과 격식 있는 자리 모두에 어울립니다." },
    { id: "shoes", name: "어반 레더 스니커즈", price: "89,000원", description: "부드러운 가죽과 쿠션 밑창을 사용한 \n데일리 스니커즈입니다. \n차분한 배색으로 다양한 옷에 자연스럽게 어울립니다." },
    { id: "travel", name: "코발트 아일랜드 3박 4일 패키지", price: "1,290,000원", description: "푸른 해변 리조트 3박과 왕복 항공권을 \n포함한 휴양 패키지입니다. \n경기가 끝나면 주소를 확인해야합니다." },
    { id: "dress", name: "마린 네이비 원피스", price: "79,000원", description: "가볍게 흐르는 소재와 단정한 허리선이 \n특징인 네이비 원피스입니다. \n여름 외출과 휴양지에 잘 어울립니다." },
    { id: "key", name: "아주 평범한 열쇠", price: "50,000P", description: "출처와 용도를 알 수 없는 오래된 열쇠입니다. \n표면의 푸른 보석이 희미하게 빛나고 있습니다." },
  ],
  hiddenStock: { label: "숨은 재고 · 단 하나", name: "레전드 오브 L", description: "오랫동안 목록에서 사라져 있던 정체불명의 한정 상품입니다." },
  detailEyebrow: "오늘의 추천 상품",
  waterReceive: "무료 샘플 받기",
  waterReceived: "샘플 수령 완료",
  cardNote: ["엄청난 퀄리티의 카드 품질!", '"확대하지 않으면" 보기 힘든 정품 마크 포함!', "유사품에 주의하세요!"],
  keyBuy: "50,000P 사용",
  purchased: "구매 완료",
  addToCart: "장바구니에 담기",
  toast: {
    water: "생수가 인벤토리에 추가되었습니다.",
    letter: (letter: string) => `문자 단서 ${letter}를 획득했습니다.`,
    insufficientPoints: "보유 포인트가 부족합니다.",
    keyPurchased: "50,000P를 사용해 열쇠를 구매했습니다.",
    cartError: "오류로 인해 장바구니에 추가할 수 없었습니다.",
  },
} as const;

export const sportsText = {
  team: { home: "강림FC", away: "도림FC" },
  initialCommentary: "양 팀 선수들이 각자의 위치를 잡고 있습니다.",
  commentary: {
    contest: "치열한 경합 끝에 공이 예상하지 못한 방향으로 튕겨 나갑니다.",
    shot: (team: string) => `${team}가 골문을 향해 슈팅합니다.`,
    dribble: (team: string) => `${team}가 빈 공간으로 공을 몰고 올라갑니다.`,
    pass: (team: string) => `${team}가 움직이는 동료에게 패스합니다.`,
    homeGoal: "강림FC의 골입니다. 도림FC가 중앙에서 경기를 재개합니다.",
    homeMiss: "강림FC의 슈팅이 골문을 벗어났습니다.",
    awayGoal: "도림FC의 골입니다. 강림FC가 중앙에서 경기를 재개합니다.",
    awayMiss: "도림FC의 슈팅이 골문을 벗어났습니다.",
  },
  toast: { success: "예측 성공 보상으로 50,000P를 획득했습니다.", failed: "예측이 빗나가 보상은 지급되지 않았습니다." },
  kicker: "경기 전의 모든 순간",
  title: "하프타임 스포츠",
  liveChip: "12라운드 · 오늘",
  ended: "종료",
  scheduled: "예정",
  venue: "오늘 · 해질녘 구장",
  predictionLabel: "승부 예측",
  predictionTitle: "선수들의 움직임에 따라 매 경기 결과가 달라집니다.",
  homeWin: "홈 승",
  draw: "무승부",
  sameScore: "같은 점수",
  awayWin: "원정 승",
  skip: "경기 건너뛰기",
  predictionSuccess: "예측 성공",
  predictionFailed: "예측 실패",
  finalScore: (home: number, away: number) => `최종 스코어 ${home} : ${away}`,
  reward: "P 예측 보상 50,000P가 지급되었습니다.",
  noReward: "이번 경기의 보상은 지급되지 않았습니다.",
  retry: "다시 예측하기",
} as const;

export const adGameText = {
  toast: {
    started: "고대 열쇠를 사용했습니다. G의 전설이 시작됩니다.",
    keyNotSelected: "잠긴 장치가 미세하게 떨리다 멈춘다.",
    noKey: "잠긴 장치는 아무 반응도 하지 않는다.",
  },
  kicker: "CLASSIC ACTION RPG",
  title: "G의 전설",
  subtitle: "칠흑 성에 향하는 여정",
  cabinetTitle: "THE LEGEND OF G",
  clearLabel: "GAME CLEAR!",
  clearTitle: "전설의 G를 획득했다!",
  clearDescription: "공주를 구출하고 왕가의 보물을 새로운 단서로 손에 넣었습니다.",
  replay: "REPLAY",
  portalReturn: "포털로 돌아가기",
} as const;
