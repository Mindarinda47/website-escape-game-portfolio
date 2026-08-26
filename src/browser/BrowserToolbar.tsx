import { useState } from "react";
import { useGameState } from "../state/GameStateContext";
import { pageTitles } from "../state/selectors";
import type { ZoomPercent } from "../state/types";
import { AddressBar } from "./AddressBar";

type Props = {
  onRefresh: () => void;
  onFind: () => void;
  onReset: () => void;
  onFullscreen: () => void;
  fullscreen: boolean;
};

export function BrowserToolbar({ onRefresh, onFind, onReset, onFullscreen, fullscreen }: Props) {
  const { state, dispatch } = useGameState();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <div className="tab-strip">
        <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
        <div className="active-tab"><span className="site-favicon">◇</span>{pageTitles[state.currentPage]}</div>
      </div>
      <div className="browser-toolbar">
        <div className="nav-buttons">
          <button aria-label="뒤로 가기" title="뒤로" disabled={state.historyIndex === 0} onClick={() => dispatch({ type: "HISTORY_BACK" })}>←</button>
          <button aria-label="앞으로 가기" title="앞으로" disabled={state.historyIndex >= state.virtualHistory.length - 1} onClick={() => dispatch({ type: "HISTORY_FORWARD" })}>→</button>
          <button aria-label="새로고침" title="새로고침" onClick={onRefresh}>↻</button>
          <button aria-label="홈으로 이동" title="홈" onClick={() => dispatch({ type: "NAVIGATE", page: "portal" })}>⌂</button>
        </div>
        <AddressBar />
        <div className="tool-buttons">
          <button aria-label="페이지 내 찾기" title="페이지 내 찾기" onClick={onFind}>⌕</button>
          <button aria-label={fullscreen ? "전체화면 종료" : "전체화면"} title={fullscreen ? "전체화면 종료" : "전체화면"} aria-pressed={fullscreen} onClick={onFullscreen}>{fullscreen ? "⤡" : "⛶"}</button>
          <button
            aria-label={state.browser.darkMode ? "라이트 모드 켜기" : "다크 모드 켜기"}
            title="화면 테마"
            aria-pressed={state.browser.darkMode}
            onClick={() => dispatch({ type: "SET_DARK_MODE", value: !state.browser.darkMode })}
          >{state.browser.darkMode ? "☀" : "◐"}</button>
          <label className="zoom-control" title="페이지 확대">
            <span className="sr-only">페이지 확대</span>
            <select
              aria-label="페이지 확대 비율"
              value={state.browser.zoomPercent}
              onChange={(event) => dispatch({ type: "SET_ZOOM", value: Number(event.target.value) as ZoomPercent })}
            >
              {[75, 100, 125, 150].map((zoom) => <option key={zoom} value={zoom}>{zoom}%</option>)}
            </select>
          </label>
          <div className="options-wrap">
            <button aria-label="옵션 열기" title="옵션" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>⋮</button>
            {menuOpen && <div className="options-menu"><button onClick={() => { setMenuOpen(false); onReset(); }}>진행 초기화</button></div>}
          </div>
        </div>
      </div>
    </>
  );
}
