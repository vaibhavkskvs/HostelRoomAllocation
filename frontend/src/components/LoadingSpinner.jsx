/**
 * components/LoadingSpinner.jsx
 */
export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-cyan-500 animate-spin" />
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}

/**
 * components/ErrorMessage.jsx
 */
export function ErrorMessage({ error, onRetry }) {
  return (
    <div className="card p-8 text-center max-w-md mx-auto">
      <div className="text-4xl mb-3">⚠️</div>
      <h3 className="text-lg font-semibold text-red-400 mb-2">Something went wrong</h3>
      <p className="text-slate-400 text-sm mb-4">{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm">
          Try Again
        </button>
      )}
    </div>
  );
}
