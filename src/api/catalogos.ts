import { get, post, put } from './client'
import type {
  CatalogoEvento,
  CatalogoEventoInput,
  EstadoOportunidad,
  Financiadora,
  FinanciadoraInput,
  Modelo,
  ModeloInput,
} from '@/types'

export const financiadorasApi = {
  listar: async (): Promise<Financiadora[]> => {
    const res = await get<Financiadora[]>('/financiadoras')
    return res.data
  },
  crear: async (input: FinanciadoraInput): Promise<Financiadora> => {
    const res = await post<Financiadora>('/financiadoras', input)
    return res.data
  },
  actualizar: async (id: number, input: Partial<FinanciadoraInput>): Promise<Financiadora> => {
    const res = await put<Financiadora>(`/financiadoras/${id}`, input)
    return res.data
  },
}

export const modelosApi = {
  listar: async (): Promise<Modelo[]> => {
    const res = await get<Modelo[]>('/modelos')
    return res.data
  },
  crear: async (input: ModeloInput): Promise<Modelo> => {
    const res = await post<Modelo>('/modelos', input)
    return res.data
  },
  actualizar: async (id: number, input: Partial<ModeloInput>): Promise<Modelo> => {
    const res = await put<Modelo>(`/modelos/${id}`, input)
    return res.data
  },
}

export const catalogoEventosApi = {
  listar: async (etapa_asociada?: EstadoOportunidad): Promise<CatalogoEvento[]> => {
    const res = await get<CatalogoEvento[]>('/catalogo-eventos', etapa_asociada ? { etapa_asociada } : undefined)
    return res.data
  },
  crear: async (input: CatalogoEventoInput): Promise<CatalogoEvento> => {
    const res = await post<CatalogoEvento>('/catalogo-eventos', input)
    return res.data
  },
  actualizar: async (id: number, input: Partial<CatalogoEventoInput>): Promise<CatalogoEvento> => {
    const res = await put<CatalogoEvento>(`/catalogo-eventos/${id}`, input)
    return res.data
  },
}
