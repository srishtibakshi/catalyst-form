export function deriveCohort(
  reaction: string,
  experience: string,
  confidence: number | null
): string {
  const conf = confidence ?? 0
  const isAnxious  = /Anxious|Sceptical/i.test(reaction)
  const isExcited  = /Excited/i.test(reaction)
  const isUser     = /regularly/i.test(experience)
  const isExplorer = /few times|Once or twice/i.test(experience)
  const isBeginner = /Not intentionally|No —/i.test(experience)

  if (isAnxious)                    return 'Anxious / Sceptic'
  if (isUser && conf >= 4)          return 'Power User'
  if (isUser)                       return 'Confident User'
  if (isExplorer && isExcited)      return 'Eager Explorer'
  if (isExplorer)                   return 'Explorer'
  if (isBeginner && isExcited)      return 'Keen Beginner'
  return 'Beginner'
}
