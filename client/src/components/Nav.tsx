interface NavProps {
  userId: number
}

export default function Nav({ userId }: NavProps) {
  return (
    <nav className="nav">
      <b>GymBuddy AI</b> |{' '}
      <a href={`/dashboard/${userId}`}>Dashboard</a> |{' '}
      <a href={`/matches/${userId}`}>Find Buddy</a> |{' '}
      <a href={`/chat/${userId}`}>Chat</a>
    </nav>
  )
}
