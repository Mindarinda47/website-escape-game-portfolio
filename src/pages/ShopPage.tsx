import { useState } from "react";
import { useGameState } from "../state/GameStateContext";
import waterProductImage from "../image/products/생수.png";
import cardProductImage from "../image/products/트레이딩 카드.png";
import cardZoomImage from "../image/products/카드확대.png";
import consoleProductImage from "../image/products/게임기상품.png";
import watchProductImage from "../image/products/손목시계상품.png";
import shoesProductImage from "../image/products/신발상품.png";
import travelProductImage from "../image/products/여행패키지.png";
import keyProductImage from "../image/products/열쇠상품.png";
import dressProductImage from "../image/products/원피스상품.png";
import legendLImage from "../image/L.png";
import { shopText } from "../content/text";

type Product = { id: string; name: string; price: string; image: string; description: string };

const productImages: Record<string, string> = {
  water: waterProductImage, card: cardProductImage, console: consoleProductImage, watch: watchProductImage,
  shoes: shoesProductImage, travel: travelProductImage, dress: dressProductImage, key: keyProductImage,
};
const products: Product[] = shopText.products.map((product) => ({ ...product, image: productImages[product.id] }));

const shuffledProducts = [...products].sort(() => Math.random() - 0.5);

export function ShopPage() {
  const { state, dispatch, notify } = useGameState();
  const [detail, setDetail] = useState<Product | null>(null);

  function collectWater() {
    if (state.inventory.water !== "missing") return;
    dispatch({ type: "COLLECT_WATER" });
    notify(shopText.toast.water);
  }

  function collectLetter(clue: "shop-t" | "shop-l", letter: string) {
    if (state.collectedLetters[clue]) return;
    dispatch({ type: "COLLECT_LETTER", clue });
    notify(shopText.toast.letter(letter));
  }

  function buyKey() {
    if (state.inventory.key !== "missing") return;
    if (state.inventory.points < 50000) {
      notify(shopText.toast.insufficientPoints);
      return;
    }
    dispatch({ type: "BUY_KEY" });
    notify(shopText.toast.keyPurchased);
  }

  function openProduct(product: Product) {
    setDetail(product);
    if (product.id === "card") dispatch({ type: "OPEN_CARD_DETAIL" });
  }

  return (
    <main className="shop-page page-inner">
      <header className="site-header shop-header"><div><span className="site-kicker">{shopText.kicker}</span><h1>{shopText.title}</h1></div><div className="shop-tools"><span>{shopText.ranking}</span><span>{shopText.cartEmpty}</span></div></header>
      <div className="notice-bar">{shopText.notice}</div>
      <section className="product-grid" aria-label="추천 상품">
        {shuffledProducts.map((product, index) => (
          <button key={product.id} className={`product-card ${product.id === "card" ? "shimmer" : ""}`} onClick={() => openProduct(product)}>
            <span className="product-art"><img src={product.image} alt="" /></span><small>{shopText.productLabel(index + 1)}</small><strong>{product.name}</strong><span>{product.price}</span>
          </button>
        ))}
      </section>
      {state.shop.hiddenStockRevealed && (
        <section className="hidden-stock highlight-result">
          {!state.collectedLetters["shop-l"] ? <button className="hidden-stock-image" onClick={() => collectLetter("shop-l", "L")} aria-label="레전드 오브 L 상품 이미지"><img src={legendLImage} alt="" /></button> : <div className="hidden-stock-image empty" aria-label="비어 있는 상품 이미지 영역" />}
          <div><small>{shopText.hiddenStock.label}</small><h2>{shopText.hiddenStock.name}</h2><p>{shopText.hiddenStock.description}</p></div>
        </section>
      )}

      {detail && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}>
          <section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-title">
            <button className="modal-close" aria-label="상품 상세 닫기" onClick={() => setDetail(null)}>×</button>
            <div className={`product-detail-art ${detail.id === "card" && state.browser.zoomPercent >= 150 ? "card-zoom-art" : ""}`}>
              <img src={detail.id === "card" && state.browser.zoomPercent >= 150 ? cardZoomImage : detail.image} alt="" />
              {detail.id === "card" && state.browser.zoomPercent >= 150 && !state.collectedLetters["shop-t"] && <button className="card-letter-t" onClick={() => collectLetter("shop-t", "T")} aria-label="문자 단서 T 수집">T</button>}
            </div>
            <div className="product-detail-copy"><span className="eyebrow">{shopText.detailEyebrow}</span><h2 id="product-title">{detail.name}</h2><p>{detail.description}</p><strong>{detail.price}</strong>
              {detail.id === "water" && <button className="button primary" disabled={state.inventory.water !== "missing"} onClick={collectWater}>{state.inventory.water === "missing" ? shopText.waterReceive : shopText.waterReceived}</button>}
              {detail.id === "card" && state.browser.zoomPercent < 150 && <small className="product-detail-note">{shopText.cardNote[0]}<br />{shopText.cardNote[1]}<br />{shopText.cardNote[2]}</small>}
              {detail.id === "key" && <button className="button primary" disabled={state.inventory.key !== "missing"} onClick={buyKey}>{state.inventory.key === "missing" ? shopText.keyBuy : shopText.purchased}</button>}
              {detail.id !== "water" && detail.id !== "card" && detail.id !== "key" && <button className="button ghost" onClick={() => notify(shopText.toast.cartError)}>{shopText.addToCart}</button>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
