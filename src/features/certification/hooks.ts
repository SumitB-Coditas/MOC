import { useCallback } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { useClockOffset } from '@/hooks/useClockOffset'
import { useCertificationService } from './serviceContext'

export function useMyCertification() {
  const service = useCertificationService()
  const offset = useClockOffset()
  const load = useCallback(() => {
    void offset // re-evaluate when the demo clock moves
    return service.getMyCertification()
  }, [service, offset])
  return useAsync(load)
}

export function useUserCertification(userId: string) {
  const service = useCertificationService()
  const offset = useClockOffset()
  const load = useCallback(() => {
    void offset // re-evaluate when the demo clock moves
    return service.getUserCertification(userId)
  }, [service, userId, offset])
  return useAsync(load)
}

export function useAssignmentForm(assignmentId: string) {
  const service = useCertificationService()
  const offset = useClockOffset()
  const load = useCallback(() => {
    void offset // re-evaluate when the demo clock moves
    return service.getAssignmentForm(assignmentId)
  }, [service, assignmentId, offset])
  return useAsync(load)
}

export function useAllSubmissions() {
  const service = useCertificationService()
  const load = useCallback(() => service.listSubmissions(), [service])
  return useAsync(load)
}

export function useSubmission(submissionId: string) {
  const service = useCertificationService()
  const load = useCallback(() => service.getSubmission(submissionId), [service, submissionId])
  return useAsync(load)
}
