import { createContext, useContext } from 'react'
import { certificationService, type CertificationService } from './certificationService'

export const CertificationServiceContext = createContext<CertificationService>(certificationService)

export function useCertificationService(): CertificationService {
  return useContext(CertificationServiceContext)
}
