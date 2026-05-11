import { describe, expect, it } from 'vitest';
import { buildGoogleMapsSearchUrl, extractAddressMetadata } from './googlePlaces';

describe('extractAddressMetadata', () => {
  it('extracts formatted address and map metadata from a Google place', () => {
    const metadata = extractAddressMetadata({
      formatted_address: 'Av. Santa Fe 1234, Buenos Aires, Argentina',
      place_id: 'place-123',
      geometry: {
        location: {
          lat: () => -34.595778,
          lng: () => -58.394121,
        },
      },
      address_components: [
        { long_name: 'Buenos Aires', types: ['locality', 'political'] },
        { long_name: 'Ciudad Autonoma de Buenos Aires', types: ['administrative_area_level_1', 'political'] },
        { long_name: 'Argentina', types: ['country', 'political'] },
      ],
    });

    expect(metadata).toEqual({
      formattedAddress: 'Av. Santa Fe 1234, Buenos Aires, Argentina',
      placeId: 'place-123',
      locality: 'Buenos Aires',
      region: 'Ciudad Autonoma de Buenos Aires',
      country: 'Argentina',
      lat: -34.595778,
      lng: -58.394121,
    });
  });

  it('falls back safely when the place is incomplete', () => {
    expect(extractAddressMetadata({})).toEqual({
      formattedAddress: '',
      placeId: '',
      locality: '',
      region: '',
      country: '',
      lat: null,
      lng: null,
    });
  });
});

describe('buildGoogleMapsSearchUrl', () => {
  it('creates a Google Maps deep link with address and place id', () => {
    expect(buildGoogleMapsSearchUrl('Av. Santa Fe 1234, Buenos Aires', 'place-123')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Av.+Santa+Fe+1234%2C+Buenos+Aires&query_place_id=place-123'
    );
  });
});
