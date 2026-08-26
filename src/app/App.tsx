import { useState } from "react";
import { BrowserShell } from "../browser/BrowserShell";
import { ToastRegion } from "../components/ToastRegion";
import { useGameState } from "../state/GameStateContext";
import { appText } from "../content/text";

export function App() {
  const { state, dispatch } = useGameState();
  const [introOpen, setIntroOpen] = useState(() => !Object.values(state.visitedPages).some(Boolean) && !state.endingSeen);
  const [endingConfirmOpen, setEndingConfirmOpen] = useState(false);
  const [endingActive, setEndingActive] = useState(state.endingSeen);

  function startEnding() {
    dispatch({ type: "MARK_ENDING_SEEN" });
    setEndingConfirmOpen(false);
    setEndingActive(true);
  }

  if (endingActive) {
    return <EndingScreen onRestart={() => { dispatch({ type: "RESET_GAME" }); setEndingActive(false); setIntroOpen(true); }} />;
  }

  return (
    <>
      <BrowserShell onEndingAnswer={() => setEndingConfirmOpen(true)} onReset={() => setIntroOpen(true)} />
      <ToastRegion />
      {introOpen && <div className="intro-overlay"><section className="intro-card" role="dialog" aria-modal="true" aria-labelledby="intro-title"><span className="intro-symbol">⌁</span><h1 id="intro-title">{appText.intro.title}</h1>{appText.intro.lines.map((line) => <p key={line}>{line}</p>)}<button className="button primary" onClick={() => setIntroOpen(false)}>{appText.intro.openButton}</button><small>{appText.intro.help}</small></section></div>}
      {endingConfirmOpen && <div className="modal-backdrop"><section className="confirm-modal ending-confirm" role="dialog" aria-modal="true" aria-labelledby="ending-confirm-title"><h2 id="ending-confirm-title">{appText.logoutConfirm}</h2><div className="modal-actions"><button className="button primary" onClick={startEnding}>{appText.yes}</button><button className="button ghost" onClick={() => setEndingConfirmOpen(false)}>{appText.no}</button></div></section></div>}
    </>
  );
}

function EndingScreen({ onRestart }: { onRestart: () => void }) {
  const actionDelay = 1.2 + appText.ending.lines.length * 2.1;
  return <main className="ending-screen"><div className="ending-browser"><div className="ending-block b1" /><div className="ending-block b2" /><div className="ending-block b3" /><div className="ending-block b4" /></div><section className="ending-copy" aria-live="polite">{appText.ending.lines.map((line, index) => <p key={line} style={{ "--delay": `${1.5 + index * 2.1}s` } as React.CSSProperties}>{line}</p>)}<div className="ending-actions" style={{ "--ending-action-delay": `${actionDelay}s` } as React.CSSProperties}><button className="button primary" onClick={onRestart}>{appText.ending.restartButton}</button></div></section></main>;
}
