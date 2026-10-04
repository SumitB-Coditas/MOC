import { Construction } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from './PageHeader'

interface PlaceholderPageProps {
  title: string
  /** Development phase in which this page is implemented (see plan §11). */
  phase: number
}

/** Temporary page used by the Phase 0 route skeleton. Replaced phase by phase. */
export function PlaceholderPage({ title, phase }: PlaceholderPageProps) {
  const params = useParams()
  const paramEntries = Object.entries(params)

  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="size-4 text-muted-foreground" />
            Not implemented yet
            <Badge variant="secondary">Phase {phase}</Badge>
          </CardTitle>
          <CardDescription>
            This route is wired up and will be built in Phase {phase}.
          </CardDescription>
        </CardHeader>
        {paramEntries.length > 0 && (
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {paramEntries.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="font-mono">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
