import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
const state = vi.hoisted(() => ({ session: null, venue: null }));
vi.mock('./lib/runtime', () => ({
  ROUTER_MODE: 'hash', api: {get: vi.fn(async () => ({data:{user:state.session}}))},
  clearStoredSession: vi.fn(), isJwtExpired: () => false, persistSession: vi.fn(),
  readStoredSession: () => state.session, setAuthToken: vi.fn(), setUnauthorizedHandler: vi.fn(),
}));
vi.mock('./features/operations/hooks/useOperationsVenue', () => ({useOperationsVenue: () => ({venue:state.venue,venueError:null,isLoadingVenue:false,refreshVenue:vi.fn()})}));
vi.mock('./features/auth/Landing', () => ({default:()=> <div>Login route</div>}));
vi.mock('./features/home/HomeLanding', () => ({default:()=> <div>Home route</div>}));
vi.mock('./features/admin/AdminDashboard', () => ({default:()=> <div>Admin route</div>}));
vi.mock('./features/onboarding/Onboarding', () => ({default:()=> <div>Onboarding route</div>}));
vi.mock('./features/operations/routes/HoyPage', () => ({default:()=> <div>Today route</div>}));
import App from './App';
beforeEach(()=>{state.session=null;state.venue=null;window.location.hash='/';});
afterEach(()=>cleanup());
test('unauthenticated admin route returns to login', async()=>{
  window.location.hash='/admin';render(<App/>);expect(await screen.findByText('Login route')).toBeTruthy();
});
test('authorized admin can load lazy dashboard', async()=>{
  state.session={token:'test-token',role:'admin'};window.location.hash='/admin';render(<App/>);expect(await screen.findByText('Admin route')).toBeTruthy();
});
test('partner without venue is directed to lazy onboarding', async()=>{
  state.session={token:'test-token',role:'partner'};window.location.hash='/operations/hoy';render(<App/>);expect(await screen.findByText('Onboarding route')).toBeTruthy();
});
test('partner with venue can load lazy operations', async()=>{
  state.session={token:'test-token',role:'partner'};state.venue={id:1};window.location.hash='/operations/hoy';render(<App/>);expect(await screen.findByText('Today route')).toBeTruthy();
});
