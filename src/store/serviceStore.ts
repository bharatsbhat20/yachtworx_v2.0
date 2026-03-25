import { create } from 'zustand';
import type { ServiceRequest, ServiceProvider } from '../types';
import { mockRequests, mockProviders } from '../data/mockData';

interface ServiceState {
  requests: ServiceRequest[];
  providers: ServiceProvider[];
  selectedRequest: ServiceRequest | null;
  selectRequest: (id: string) => void;
  clearSelection: () => void;
}

export const useServiceStore = create<ServiceState>((set) => ({
  requests: mockRequests,
  providers: mockProviders,
  selectedRequest: null,
  selectRequest: (id) =>
    set((state) => ({
      selectedRequest: state.requests.find((r) => r.id === id) || null,
    })),
  clearSelection: () => set({ selectedRequest: null }),
}));
