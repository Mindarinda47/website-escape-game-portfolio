import { useEffect } from "react";
import { bgmForAdventure, setBgm, stopBgm } from "../BGM/bgm";
import { AdventureCanvas } from "../minigame/AdventureCanvas";
import { useGameState } from "../state/GameStateContext";
import gLegendLogo from "../image/g-legend-logo-transparent.png";
import legendaryGImage from "../image/legendary-g-sprite-512.png";
import { adGameText } from "../content/text";
export function AdGamePage() {
  const { state, dispatch, notify } = useGameState();

  useEffect(() => {
    setBgm(bgmForAdventure(state.adGame.keyUsed, state.adGame.checkpoint, state.adGame.bossDefeated));
  }, [state.adGame.bossDefeated, state.adGame.checkpoint, state.adGame.keyUsed]);

  useEffect(() => () => stopBgm(700), []);

  function useKey() {
    if (state.adGame.keyUsed) return;
    if (state.inventory.selectedItem === "key" && state.inventory.key === "owned") {
      dispatch({ type: "USE_KEY" });
      notify(adGameText.toast.started);
    } else if (state.inventory.key === "owned") {
      notify(adGameText.toast.keyNotSelected);
    } else {
      notify(adGameText.toast.noKey);
    }
  }

  return (
    <main className="ad-game-page page-inner">
      <header className="arcade-header"><div><span className="pixel-label">{adGameText.kicker}</span><h1>{adGameText.title}</h1></div><span>{adGameText.subtitle}</span></header>
      {!state.adGame.keyUsed ? (
        <section className="arcade-cabinet">
          <div className="cabinet-screen"><img className="g-legend-start-logo" src={gLegendLogo} alt="G의 전설" /><h2>{adGameText.cabinetTitle}</h2><p>WASD · SPACE · E</p></div>
          <button className={`key-slot ${state.inventory.selectedItem === "key" ? "item-target" : ""}`} onClick={useKey}><span>⚿</span><b>KEY</b><small>{state.inventory.key === "missing" ? "LOCKED" : state.inventory.selectedItem === "key" ? "UNLOCK" : "···"}</small></button>
        </section>
      ) : state.adGame.checkpoint === "clear" ? (
        <section className="adventure-clear"><img className="legendary-g-reward" src={legendaryGImage} alt="왕가에 전해 내려오는 전설의 G" /><span className="pixel-label">{adGameText.clearLabel}</span><h2>{adGameText.clearTitle}</h2><p>{adGameText.clearDescription}</p><div className="modal-actions"><button className="button primary" onClick={() => dispatch({ type: "REPLAY_ADVENTURE" })}>{adGameText.replay}</button><button className="button ghost portal-return-button" onClick={() => dispatch({ type: "NAVIGATE", page: "portal" })}>{adGameText.portalReturn}</button></div></section>
      ) : <AdventureCanvas />}
    </main>
  );
}
