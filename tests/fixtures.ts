import type { FellowshipApplication } from '@/lib/fellowship'

export function validApplication(overrides: Partial<FellowshipApplication> = {}): FellowshipApplication {
  return {
    name: '  Amina Yusuf ',
    email: ' Amina@Example.ORG ',
    location: 'Lagos, Nigeria',
    link: '',
    stage: 'Changing direction — moving in from another field',
    background: 'Ten years as a ward nurse.',
    why_sector: 'A food bank kept my family going one winter.',
    sector_connection: ['I volunteer or have volunteered'],
    focus_areas: ['Donor engagement', 'Grantmaking'],
    ai_comfort: 2,
    built_something: 'A rota system for our ward.',
    problem_idea: 'Grant reporting eats a week every quarter.',
    time_commitment: 'Part time — around 15 to 20 hours',
    heard_from: '',
    anything_else: '',
    consent: true,
    ...overrides,
  }
}
