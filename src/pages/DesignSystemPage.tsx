import { CheckCircle2, Info, Plus, TriangleAlert, XCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { FormField } from '@/components/common/FormField'
import { LoadingIndicator } from '@/components/common/LoadingIndicator'
import { PageHeader } from '@/components/common/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/** Development-only catalogue of the design system components (route: /design-system). */
export function DesignSystemPage() {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const emailError =
    touched && !/^\S+@\S+\.\S+$/.test(email) ? 'Enter a valid email address.' : undefined

  return (
    <main className="mx-auto w-full max-w-4xl space-y-10 p-4 md:p-8">
      <PageHeader
        title="Design System"
        description="Shared components used across the Certificate Management System."
        actions={<Badge variant="info">Development only</Badge>}
      />

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button>
            <Plus data-icon="inline-start" />
            With icon
          </Button>
          <Button disabled>
            <Spinner data-icon="inline-start" aria-hidden="true" />
            Saving…
          </Button>
          <Button variant="outline" size="icon" aria-label="Add">
            <Plus />
          </Button>
        </div>
      </Section>

      <Section title="Input & FormField">
        <Card>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField label="First name" required>
              {(control) => <Input {...control} placeholder="Jane" />}
            </FormField>
            <FormField
              label="Email"
              required
              description="Validated on blur in this demo."
              error={emailError}
            >
              {(control) => (
                <Input
                  {...control}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="jane@example.com"
                />
              )}
            </FormField>
            <FormField label="Date of birth" description="Must be a date in the past.">
              {(control) => <Input {...control} type="date" />}
            </FormField>
            <FormField label="Certificate number" error="Certificate number is required.">
              {(control) => <Input {...control} />}
            </FormField>
            <FormField label="Disabled field">
              {(control) => <Input {...control} disabled value="Read only" />}
            </FormField>
          </CardContent>
        </Card>
      </Section>

      <Section title="Card">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Certification application</CardTitle>
              <CardDescription>Assigned on 4 Oct 2026</CardDescription>
            </CardHeader>
            <CardContent>Cards group related content and actions.</CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="outline">Save draft</Button>
              <Button>Submit</Button>
            </CardFooter>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>Compact card</CardTitle>
              <CardDescription>size=&quot;sm&quot;</CardDescription>
            </CardHeader>
            <CardContent>Tighter spacing for dense layouts.</CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Section>

      <Section title="Alert">
        <div className="grid gap-3">
          <Alert>
            <Info />
            <AlertTitle>Default</AlertTitle>
            <AlertDescription>Neutral information for the user.</AlertDescription>
          </Alert>
          <Alert variant="info">
            <Info />
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>Your renewal window opens soon.</AlertDescription>
          </Alert>
          <Alert variant="success">
            <CheckCircle2 />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Your application was submitted.</AlertDescription>
          </Alert>
          <Alert variant="warning">
            <TriangleAlert />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Your renewal is overdue. You are in the grace period.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <XCircle />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Something went wrong. Please try again.</AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section title="LoadingIndicator">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-8">
            <LoadingIndicator size="sm" />
            <LoadingIndicator size="md" label="Loading users…" />
            <LoadingIndicator size="lg" hideLabel />
          </CardContent>
        </Card>
        <Card>
          <LoadingIndicator layout="block" label="Loading submissions…" />
        </Card>
      </Section>
    </main>
  )
}
