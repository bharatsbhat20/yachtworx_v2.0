import { create } from 'zustand';
import type { ServiceRequest, ServiceProvider } from '../types';
import { mockServiceRequests, mockProviders } from '../data/mockData';

interface ServiceState {
  requests: ServiceRequest[];
  providers: ServiceProvider[];
  selectedRequest: ServiceRequest | null;
  selectRequest: (id: string) => void;
  clearSelection: () => void;
}

export const useServiceStore = create<ServiceState>((set) => ({
  requests: mockServiceRequests,
  providers: mockProviders,
  selectedRequest: null,
  selectRequest: (id) =>
    set((state) => ({
      selectedRequest: state.requests.find((r) => r.id === id) || null,
    })),
  clearSelection: () => set({ selectedRequest: null }),
}));
