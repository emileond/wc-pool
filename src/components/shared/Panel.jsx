export default function Panel({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-base-300 bg-base-100 ${className}`}>
      <div className="p-5">{children}</div>
    </div>
  )
}
