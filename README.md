# Website Escape Game

3일 동안 제작한 1인 게임 개발 프로젝트입니다. 가상의 웹 브라우저 안에서 여러 페이지를 탐색하고, 아이템과 단서를 조합해 탈출 조건을 찾는 구조입니다.

이 저장소는 2026년 넥슨 넥토리얼 Game Programming 지원을 위해 원본 저장소의 추적 파일만 선별한 비공개 포트폴리오 사본입니다. 제출 문서와 개인정보 가능 자료는 포함하지 않았습니다.

## 핵심 정보

- 형태: 1인 프로젝트
- 개발 기간: 약 3일
- 기술: React, TypeScript, Vite, Canvas 2D, Vitest
- 담당: 기획, 상태 설계, 게임 로직, UI 구현, 테스트, AI 결과 검토
- 원본: <https://github.com/Mindarinda47/website-escape-game>

## 구현 기능

- 가상 브라우저의 페이지 이동과 방문 기록
- 여러 웹 페이지에 분산된 퍼즐과 아이템 연동
- 인벤토리와 전역 게임 상태 관리
- Canvas 기반 이동, 충돌, 적, 투사체, 보스 패턴
- 버전이 있는 로컬 저장 데이터와 손상 데이터 복구
- 기능 순서에 영향을 받지 않는 상태 전환 검증

## 검증

- Vitest 테스트 파일 6개
- 자동화 테스트 33개
- 타입 검사, 린트, 프로덕션 빌드 스크립트 제공

```bash
npm install
npm run test
npm run build
npm run dev
```

## 문서

- [구조 설명](docs/architecture.md)
- [문제해결 사례](docs/problem-solving.md)
- [AI 활용 범위](docs/ai-usage.md)

## 공개 전 확인사항

- 이미지와 음원 에셋의 공개·재배포 가능 여부를 다시 확인해야 합니다.
- 이 저장소의 정리 시점과 실제 개발 기간은 구분합니다.

