import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type Place = {
  name: string;
  address: string;
  city: string | null;
  latitude: number;
  longitude: number;
};

type NominatimResult = {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string | undefined>;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const MIN_INTERVAL_MS = 1000; // Nominatim usage policy: max 1 request/second
const TIMEOUT_MS = 5000;

// Place search (geocoding) via OpenStreetMap Nominatim, proxied so the app
// needs no third-party key. Results are cached and upstream calls throttled.
@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private readonly cache = new Map<string, { at: number; value: Place[] }>();
  private queue: Promise<unknown> = Promise.resolve();
  private lastCallAt = 0;
  private readonly baseUrl: string;
  private readonly countryCodes: string;
  private readonly userAgent: string;

  constructor(config: ConfigService) {
    this.baseUrl = config
      .getOrThrow<string>('PLACES_BASE_URL')
      .replace(/\/$/, '');
    this.countryCodes = config.get<string>('PLACES_COUNTRY_CODES') ?? '';
    const contact = config.get<string>('PLACES_CONTACT_EMAIL');
    this.userAgent = `LifeLink/1.0${contact ? ` (${contact})` : ''}`;
  }

  async search(query: string, limit: number): Promise<Place[]> {
    const key = `${query.toLowerCase()}|${limit}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

    const value = await this.throttled(() => this.fetchPlaces(query, limit));
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      // Evict the oldest entry (Map preserves insertion order).
      const oldest = this.cache.keys().next();
      if (!oldest.done) this.cache.delete(oldest.value);
    }
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }

  private throttled<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const wait = this.lastCallAt + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.lastCallAt = Date.now();
      return task();
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  // Address for a coordinate (used for "use my current location").
  async reverse(lat: number, lng: number): Promise<Place | null> {
    const key = `rev|${lat.toFixed(4)}|${lng.toFixed(4)}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.value[0] ?? null;
    }
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '16',
    });
    const result = await this.throttled(() =>
      this.request<NominatimResult & { error?: string }>(`reverse?${params}`),
    );
    const value = result && !result.error ? [toPlace(result)] : [];
    this.cache.set(key, { at: Date.now(), value });
    return value[0] ?? null;
  }

  private async request<T>(path: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/${path}`, {
        headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.warn(
        `Place lookup failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new ServiceUnavailableException(
        'Place search is unavailable right now',
      );
    }
    if (!response.ok) {
      this.logger.warn(`Place lookup returned HTTP ${response.status}`);
      throw new ServiceUnavailableException(
        'Place search is unavailable right now',
      );
    }
    return (await response.json()) as T;
  }

  private async fetchPlaces(query: string, limit: number): Promise<Place[]> {
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      limit: String(limit),
    });
    if (this.countryCodes) params.set('countrycodes', this.countryCodes);
    const results = await this.request<NominatimResult[]>(`search?${params}`);
    return results.map(toPlace);
  }
}

function toPlace(r: NominatimResult): Place {
  return {
    name: r.name || r.display_name.split(',')[0],
    address: r.display_name,
    city:
      r.address?.city ??
      r.address?.town ??
      r.address?.village ??
      r.address?.state_district ??
      null,
    latitude: Number(r.lat),
    longitude: Number(r.lon),
  };
}
