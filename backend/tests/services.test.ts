import { initializeStadiumData, getStadiumGraph, getAllAmenities, getAmenityById, getAllTransitOptions } from '../src/data/dataLoader';
import * as dataLoader from '../src/data/dataLoader';
import { getCrowdDensityForZone, getAllCrowdDensity, startCrowdDensitySimulation } from '../src/services/crowdDensity';
import { getWaitTime } from '../src/services/waitTime';
import { getTransportOptions } from '../src/services/transport';
import { getAccessibilityInfo } from '../src/services/accessibility';
import { recordQuery, getDashboardData, classifyQueryCategory } from '../src/services/analytics';

describe('FanGuide AI — Core Services Integration Tests', () => {
  // Populates cached data files so other services have real graph/amenity maps
  beforeAll(() => {
    initializeStadiumData();
  });

  describe('DataLoader Service', () => {
    test('loads graph nodes and edges successfully', () => {
      const graph = getStadiumGraph();
      expect(graph).toBeDefined();
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
    });

    test('retrieves all amenities', () => {
      const amenities = getAllAmenities();
      expect(amenities).toBeDefined();
      expect(amenities.length).toBeGreaterThan(0);
    });

    test('retrieves a specific amenity by ID', () => {
      const all = getAllAmenities();
      if (all.length > 0) {
        const id = all[0].id;
        const amenity = getAmenityById(id);
        expect(amenity).not.toBeNull();
        expect(amenity?.id).toBe(id);
      }
    });

    test('returns undefined for unknown amenity ID', () => {
      const amenity = getAmenityById('non-existent-id');
      expect(amenity).toBeUndefined();
    });

    test('retrieves all transit options', () => {
      const transit = getAllTransitOptions();
      expect(transit).toBeDefined();
      expect(transit.length).toBeGreaterThan(0);
    });
  });

  describe('CrowdDensity Service', () => {
    test('returns crowd density for a specific zone', () => {
      const density = getCrowdDensityForZone('gate-A');
      expect(density).not.toBeNull();
      expect(density?.zoneId).toBe('gate-A');
      expect(['low', 'medium', 'high']).toContain(density?.density);
    });

    test('returns null for unknown zone ID', () => {
      const density = getCrowdDensityForZone('unknown-zone');
      expect(density).toBeNull();
    });

    test('returns full crowd density state', () => {
      const state = getAllCrowdDensity();
      expect(state).toBeDefined();
      expect(state.zones).toBeDefined();
      expect(Object.keys(state.zones).length).toBeGreaterThan(0);
    });

    test('can start crowd density simulation interval', () => {
      const interval = startCrowdDensitySimulation(1000);
      expect(interval).toBeDefined();
      clearInterval(interval);
    });
  });

  describe('WaitTime Service', () => {
    test('calculates wait time for valid restrooms in different concourses and densities', () => {
      const concourses = ['N', 'E', 'S', 'W'];
      for (const suffix of concourses) {
        const id = `restroom-${suffix}1`;
        const zoneId = `concourse-${suffix}`;
        
        // Mock crowd density to test different switch branches in getWaitTime
        const state = getAllCrowdDensity();
        if (suffix === 'N') state.zones[zoneId].density = 'low';
        else if (suffix === 'E') state.zones[zoneId].density = 'medium';
        else state.zones[zoneId].density = 'high';

        const wait = getWaitTime(id);
        expect(wait).not.toBeNull();
        expect(wait?.amenityId).toBe(id);
        expect(wait?.estimatedWaitMinutes).toBeGreaterThanOrEqual(0);
        expect(['none', 'short', 'moderate', 'long']).toContain(wait?.queueLength);
      }
    });

    test('returns null for invalid amenity', () => {
      const wait = getWaitTime('non-existent-amenity');
      expect(wait).toBeNull();
    });

    test('fallback for gate nodes or unrecognized suffixes', () => {
      jest.spyOn(dataLoader, 'getAmenityById').mockReturnValueOnce({
        id: 'merch-custom',
        name: 'Custom Merch',
        type: 'merch',
        nodeId: 'gate-A',
        accessible: true,
        level: 1
      } as any);

      const wait = getWaitTime('merch-custom');
      expect(wait).not.toBeNull();
    });
  });

  describe('Transport Service', () => {
    test('fuzzy searches transit recommendations and calculates leave-by times', () => {
      const recommendations = getTransportOptions('Penn Station', 45, '2026-07-19T18:00:00.000Z');
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].option.id).toBe('njt-meadowlands');
      expect(recommendations[0].leaveByTime).toBeDefined();
      expect(recommendations[0].totalJourneyMinutes).toBeGreaterThan(0);
    });

    test('fuzzy searches for post-game departure with negative offset', () => {
      const recommendations = getTransportOptions('Penn Station', -30, '2026-07-19T18:00:00.000Z');
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].leaveByTime).toBeDefined();
    });

    test('returns empty array if no destination matches', () => {
      const recommendations = getTransportOptions('non-existent-city-999', 60);
      expect(recommendations).toEqual([]);
    });
  });

  describe('Accessibility Service', () => {
    test('returns accessibility info for a valid gate ID', () => {
      const info = getAccessibilityInfo('gate-A');
      expect(info).not.toBeNull();
      expect(info?.gateId).toBe('gate-A');
      expect(info?.nearestAccessibleRestroom).toBeDefined();
    });

    test('returns null accessibility info for an invalid gate ID', () => {
      const info = getAccessibilityInfo('gate-unknown');
      expect(info).toBeNull();
    });
  });

  describe('Analytics Service', () => {
    test('records queries and builds dashboard stats correctly', () => {
      recordQuery('session-1', 'navigation', false);
      recordQuery('session-1', 'accessibility', true);

      const dashboard = getDashboardData();
      expect(dashboard).toBeDefined();
      expect(dashboard.queryCounts.navigation).toBeGreaterThanOrEqual(1);
      expect(dashboard.queryCounts.accessibility).toBeGreaterThanOrEqual(1);
      expect(dashboard.urgentAlerts.length).toBeGreaterThanOrEqual(1);
      expect(dashboard.urgentAlerts[0].isUrgent).toBe(true);
    });

    test('correctly classifies queries by categories', () => {
      expect(classifyQueryCategory('emergency help ambulance')).toBe('emergency');
      expect(classifyQueryCategory('need a ramp or lift accessibility')).toBe('accessibility');
      expect(classifyQueryCategory('where is the restroom bathroom WC')).toBe('restroom');
      expect(classifyQueryCategory('want to eat food drink snack')).toBe('food');
      expect(classifyQueryCategory('how to leave via train or transit option')).toBe('transit');
      expect(classifyQueryCategory('buy merchandise or scarf or hat')).toBe('merchandise');
      expect(classifyQueryCategory('where is my section and seat')).toBe('navigation');
      expect(classifyQueryCategory('random greetings hello')).toBe('other');
    });
  });
});
