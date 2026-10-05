import { Search } from 'lucide-react'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { RoleFilter, StatusFilter } from '@/types/users'
import type { UserFilters } from '../filters'

interface UserFiltersBarProps {
  filters: UserFilters
  onChange: (filters: UserFilters) => void
}

export function UserFiltersBar({ filters, onChange }: UserFiltersBarProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
      <FormField label="Search">
        {(control) => (
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              {...control}
              type="search"
              className="pl-8"
              placeholder="Name or email"
              value={filters.search}
              onChange={(event) => onChange({ ...filters, search: event.target.value })}
            />
          </div>
        )}
      </FormField>
      <FormField label="Role">
        {(control) => (
          <NativeSelect
            {...control}
            className="w-full"
            value={filters.role}
            onChange={(event) => onChange({ ...filters, role: event.target.value as RoleFilter })}
          >
            <NativeSelectOption value="ALL">All roles</NativeSelectOption>
            <NativeSelectOption value="CANDIDATE">Candidates</NativeSelectOption>
            <NativeSelectOption value="DIPLOMATE">Diplomates</NativeSelectOption>
          </NativeSelect>
        )}
      </FormField>
      <FormField label="Status">
        {(control) => (
          <NativeSelect
            {...control}
            className="w-full"
            value={filters.status}
            onChange={(event) =>
              onChange({ ...filters, status: event.target.value as StatusFilter })
            }
          >
            <NativeSelectOption value="ACTIVE">Active</NativeSelectOption>
            <NativeSelectOption value="INACTIVE">Inactive</NativeSelectOption>
            <NativeSelectOption value="ALL">All statuses</NativeSelectOption>
          </NativeSelect>
        )}
      </FormField>
    </div>
  )
}
