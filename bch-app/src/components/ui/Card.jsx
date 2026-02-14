export default function Card({ children, bordered, borderColor, className = '', onClick }) {
  return (
    <div
      className={`bg-white rounded-2xl p-4 shadow-sm
        ${bordered ? `border-l-4 ${borderColor || 'border-blue-primary'}` : ''}
        ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}
        ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
