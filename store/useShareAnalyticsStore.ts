import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShareEvent, ShareStatistics, SharePlatform, ShareStatus } from '@/types/shareTypes';
import * as Network from 'expo-network';
import Constants from 'expo-constants';

interface ShareAnalyticsState {
  events: ShareEvent[];
  statistics: ShareStatistics;
  isLoading: boolean;
  
  // Actions
  logShareEvent: (event: Omit<ShareEvent, 'id' | 'timestamp' | 'retryCount'>) => Promise<void>;
  updateShareStatus: (eventId: string, status: ShareStatus, error?: string) => void;
  incrementRetryCount: (eventId: string) => void;
  getRecentEvents: (limit?: number) => ShareEvent[];
  getEventsByPlatform: (platform: SharePlatform) => ShareEvent[];
  getEventsByDateRange: (startDate: Date, endDate: Date) => ShareEvent[];
  calculateStatistics: () => void;
  clearOldEvents: (daysToKeep?: number) => void;
  exportAnalytics: () => Promise<string>;
}

const STORAGE_KEY = '@poetcam_share_analytics';
const MAX_EVENTS = 1000;
const DEFAULT_DAYS_TO_KEEP = 30;

export const useShareAnalyticsStore = create<ShareAnalyticsState>()(
  persist(
    (set, get) => ({
      events: [],
      statistics: {
        totalShares: 0,
        successfulShares: 0,
        failedShares: 0,
        platformBreakdown: {} as Record<SharePlatform, number>,
        hourlyDistribution: {},
        dailyDistribution: {},
        averageRetryCount: 0,
      },
      isLoading: false,

      logShareEvent: async (eventData) => {
        const networkState = await Network.getNetworkStateAsync();
        const newEvent: ShareEvent = {
          ...eventData,
          id: `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          metadata: {
            networkType: networkState.type,
            deviceInfo: `${Constants.deviceName || 'Unknown'} - ${Constants.platform?.ios ? 'iOS' : 'Android'}`,
            appVersion: Constants.expoConfig?.version || 'Unknown',
          },
        };

        set((state) => {
          const events = [newEvent, ...state.events].slice(0, MAX_EVENTS);
          return { events };
        });

        get().calculateStatistics();
      },

      updateShareStatus: (eventId, status, error) => {
        set((state) => ({
          events: state.events.map((event) =>
            event.id === eventId
              ? { ...event, status, error: error || event.error }
              : event
          ),
        }));
        get().calculateStatistics();
      },

      incrementRetryCount: (eventId) => {
        set((state) => ({
          events: state.events.map((event) =>
            event.id === eventId
              ? { ...event, retryCount: event.retryCount + 1 }
              : event
          ),
        }));
      },

      getRecentEvents: (limit = 10) => {
        const { events } = get();
        return events.slice(0, limit);
      },

      getEventsByPlatform: (platform) => {
        const { events } = get();
        return events.filter((event) => event.platform === platform);
      },

      getEventsByDateRange: (startDate, endDate) => {
        const { events } = get();
        return events.filter((event) => {
          const eventDate = new Date(event.timestamp);
          return eventDate >= startDate && eventDate <= endDate;
        });
      },

      calculateStatistics: () => {
        const { events } = get();
        
        const statistics: ShareStatistics = {
          totalShares: events.length,
          successfulShares: events.filter((e) => e.status === 'success').length,
          failedShares: events.filter((e) => e.status === 'failed').length,
          platformBreakdown: {} as Record<SharePlatform, number>,
          hourlyDistribution: {},
          dailyDistribution: {},
          averageRetryCount: 0,
        };

        // Calculate platform breakdown
        events.forEach((event) => {
          statistics.platformBreakdown[event.platform] = 
            (statistics.platformBreakdown[event.platform] || 0) + 1;

          // Calculate time distributions
          const date = new Date(event.timestamp);
          const hour = `${date.getHours().toString().padStart(2, '0')}:00`;
          const day = date.toISOString().split('T')[0];

          statistics.hourlyDistribution[hour] = 
            (statistics.hourlyDistribution[hour] || 0) + 1;
          statistics.dailyDistribution[day] = 
            (statistics.dailyDistribution[day] || 0) + 1;
        });

        // Calculate average retry count
        const totalRetries = events.reduce((sum, event) => sum + event.retryCount, 0);
        statistics.averageRetryCount = events.length > 0 ? totalRetries / events.length : 0;

        // Set last share date
        if (events.length > 0) {
          statistics.lastShareDate = events[0].timestamp;
        }

        set({ statistics });
      },

      clearOldEvents: (daysToKeep = DEFAULT_DAYS_TO_KEEP) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        set((state) => ({
          events: state.events.filter(
            (event) => new Date(event.timestamp) > cutoffDate
          ),
        }));
        get().calculateStatistics();
      },

      exportAnalytics: async () => {
        const { events, statistics } = get();
        const exportData = {
          exportDate: new Date().toISOString(),
          statistics,
          events: events.slice(0, 100), // Export only recent 100 events
        };

        return JSON.stringify(exportData, null, 2);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        events: state.events.slice(0, 500), // Persist only recent 500 events
        statistics: state.statistics,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.calculateStatistics();
          state.clearOldEvents(); // Clean up old events on startup
        }
      },
    }
  )
);