import { useGameState } from "../state/GameStateContext";

export function ToastRegion() {
  const { toasts } = useGameState();
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => <div className="toast" key={toast.id}>{toast.message}</div>)}
    </div>
  );
}
