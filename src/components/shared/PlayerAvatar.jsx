import Avatar from 'boring-avatars'

const AVATAR_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-accent)',
  'var(--color-neutral)',
  'var(--color-base-content)',
]

export default function PlayerAvatar({ name, size = 36, className = '' }) {
  return (
    <div className={`shrink-0 overflow-hidden rounded-full bg-white/90 ${className}`} style={{ width: size, height: size }}>
      <Avatar
        name={name || 'Guest'}
        variant="beam"
        colors={AVATAR_COLORS}
        size={size}
        square
      />
    </div>
  )
}
