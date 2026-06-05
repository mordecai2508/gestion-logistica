import api from './api';

export interface ClienteOption {
  id: string;
  usuario: { nombre: string; correo: string };
}

export const clienteService = {
  async search(query: string): Promise<ClienteOption[]> {
    const res = await api.get<{ data: ClienteOption[] }>('/clientes', { params: { search: query } });
    return res.data.data;
  },
};
