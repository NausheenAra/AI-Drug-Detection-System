import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export const analyzeDrugs = async (drugs: string[]) => {
  const response = await api.post('/analyze', { drugs });
  return response.data;
};

export const searchDrugs = async (query: string) => {
  const response = await api.get(`/drugs/search?q=${query}`);
  return response.data;
};
