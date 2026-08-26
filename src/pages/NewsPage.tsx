import { useGameState } from "../state/GameStateContext";
import wildfireImage from "../image/산불.png";
import extinguishedWildfireImage from "../image/산불_꺼진상태.png";
import invertedWildfireImage from "../image/산불_반전.png";
import { newsText } from "../content/text";
import { playSfx } from "../SE/sfx";

export function NewsPage() {
  const { state, dispatch, notify } = useGameState();
  const canSeeLetter = state.news.fireExtinguished && state.browser.darkMode;
  const articleImage = !state.news.fireExtinguished
    ? wildfireImage
    : state.browser.darkMode
      ? invertedWildfireImage
      : extinguishedWildfireImage;

  function handleFirePhoto() {
    if (state.news.fireExtinguished) {
      return;
    }
    if (state.inventory.selectedItem === "water" && state.inventory.water === "owned") {
      playSfx("fireExtinguish");
      dispatch({ type: "EXTINGUISH_FIRE" });
      notify(newsText.toast.extinguished);
      return;
    }
    notify(state.inventory.water === "owned" ? newsText.toast.waterNotSelected : newsText.toast.noWater);
  }

  function collectO() {
    if (state.collectedLetters["news-o"]) return;
    dispatch({ type: "COLLECT_LETTER", clue: "news-o" });
    notify(newsText.toast.letter);
  }

  return (
    <main className="news-page page-inner">
      <header className="site-header news-header"><div><span className="site-kicker">{newsText.header.kicker}</span><h1>{newsText.header.title}</h1></div><div className="today-stamp">{newsText.header.stamp}</div></header>
      <nav className="news-nav" aria-label="뉴스 분야">{newsText.navigation.map((item) => <span key={item}>{item}</span>)}</nav>
      <div className="news-layout">
        <article className="lead-story">
          <span className="eyebrow">{newsText.article.category}</span>
          <h2>{newsText.article.title}</h2>
          <p className="lead">{newsText.article.publishedAt}</p>
          <div
            className={`fire-photo ${state.news.fireExtinguished ? "extinguished" : "burning"} ${state.inventory.selectedItem === "water" ? "item-target" : ""}`}
            onClick={handleFirePhoto}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") handleFirePhoto(); }}
            role="button"
            tabIndex={0}
            aria-label={state.news.fireExtinguished ? newsText.article.extinguishedImageLabel : newsText.article.burningImageLabel}
          >
            <img src={articleImage} alt={newsText.article.imageAlt} />
            {canSeeLetter && !state.collectedLetters["news-o"] && <button className="news-letter-o" onClick={(event) => { event.stopPropagation(); collectO(); }} aria-label={newsText.article.letterLabel}>O</button>}
            <span className="photo-caption">{newsText.article.imageCaption}</span>
          </div>
          <div className="article-body">{newsText.article.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
        </article>
        <aside className="related-news"><h2>{newsText.relatedTitle}</h2>{newsText.relatedStories.map((story) => <article key={story.title}><span>{story.tag}</span><h3>{story.title}</h3><p>{story.excerpt}</p><small>{newsText.relatedTime}</small></article>)}</aside>
      </div>
    </main>
  );
}
