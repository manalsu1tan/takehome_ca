export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state error" role="alert">
      <span>{message}</span>
      {onRetry ? (
        <button className="button subtle" onClick={onRetry} type="button">
          Retry
        </button>
      ) : null}
    </div>
  );
}

