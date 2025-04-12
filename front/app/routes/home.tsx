import type { Route } from './+types/home'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Spende' },
    { name: 'description', content: 'Welcome to Spende!' },
  ]
}

export default function Home() {
  return <></>
}
