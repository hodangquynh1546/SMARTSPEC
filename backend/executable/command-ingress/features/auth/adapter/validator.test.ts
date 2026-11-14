import { describe, expect, it } from '@jest/globals';
import { ExchangeGoogleTokenBody, RefreshTokenRequestBody } from './dto';

describe('Request validators', () => {
	it('rejects an empty Google OAuth code', async () => {
		const result = await new ExchangeGoogleTokenBody({ code: '' }).validate();

		expect(result.ok).toBe(false);
		expect(result.errors).toHaveLength(1);
	});

	it('rejects a missing refresh token', async () => {
		const result = await new RefreshTokenRequestBody({}).validate();

		expect(result.ok).toBe(false);
		expect(result.errors).toHaveLength(1);
	});

	it('rejects a refresh token that does not have three parts', async () => {
		const result = await new RefreshTokenRequestBody({ refresh_token: 'abc' }).validate();

		expect(result.ok).toBe(false);
		expect(result.errors[0].constraints).toEqual({
			jsonwebtoken: 'Invalid JSON Web Token format',
		});
	});

	it('accepts a refresh token with three parts', async () => {
		const result = await new RefreshTokenRequestBody({
			refresh_token: 'ey.body.signature',
		}).validate();

		expect(result.ok).toBe(true);
		expect(result.errors).toHaveLength(0);
	});
});