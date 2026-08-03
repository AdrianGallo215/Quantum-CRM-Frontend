import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importCsvTempApi } from '@/api/importCsvTemp'
import { invalidar, qk } from './queryKeys'

export function useImportarEmpresasCsv() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => importCsvTempApi.importarEmpresas(file),
    onSuccess: () => invalidar(qc, qk.empresas, qk.inicio, qk.prospeccion),
  })
}
