interface UserAvatarProps {
  name: string
  avatarUrl?: string
  size?: 'sm' | 'md'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

// Deterministic background color based on the first character of the name
const COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-rose-500',
  'bg-cyan-500',
]

function getColor(name: string): string {
  const index = name.charCodeAt(0) % COLORS.length
  return COLORS[index]
}

export default function UserAvatar({ name, avatarUrl, size = 'sm' }: UserAvatarProps) {
  const initials = getInitials(name)
  const color = getColor(name)
  const dimension = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${dimension} rounded-full object-cover flex-shrink-0`}
        style={{
          border: '2px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 0 10px rgba(99, 102, 241, 0.15)',
        }}
      />
    )
  }

  return (
    <div
      className={`${dimension} ${color} rounded-full flex items-center justify-center flex-shrink-0`}
      title={name}
      style={{
        border: '2px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 0 10px rgba(99, 102, 241, 0.15)',
      }}
    >
      <span className={`${textSize} font-semibold text-white leading-none`}>
        {initials}
      </span>
    </div>
  )
}
