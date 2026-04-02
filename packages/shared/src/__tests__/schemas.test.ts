import { describe, it, expect } from 'vitest';
import { UserSchema, type User, LoginSchema, RegisterSchema } from '../schemas/user';
import { GameStatusSchema, GameSchema, type Game } from '../schemas/game';
import { IgdbGameSchema, IgdbSearchResultSchema } from '../schemas/igdb';
import { SyncOperations, OutboxEntrySchema } from '../schemas/sync';
import { VibeRequestSchema, RecommendationSchema, VibeResponseSchema } from '../schemas/ai';

describe('UserSchema', () => {
    describe('valid inputs', () => {
        it('should parse a fully valid user', () => {
            const validUser: User = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                email: 'joe.smith@gmail.com',
                displayName: 'joesmith1234',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const result = UserSchema.safeParse(validUser);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(validUser);
        });

        it('should trim and lowercase a denormalized email', () => {
            const user = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                email: '  JOE.SMITH@GMAIL.COM  ',
                displayName: 'joesmith1234',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(true);
            expect(result.data?.email).toBe('joe.smith@gmail.com');
        });

        it('should strip unknown fields', () => {
            const user = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                email: 'joe.smith@gmail.com',
                displayName: 'joesmith1234',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                role: 'admin',
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(true);
            expect(result.data).not.toHaveProperty('role');
        });
    });

    describe('invalid inputs', () => {
        it('should reject an invalid email', () => {
            const user: User = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                email: 'joe.smith',
                displayName: 'joesmith1234',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('email');
        });

        it('should reject a non-string email', () => {
            const user = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                email: null,
                displayName: 'joesmith1234',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('email');
        });

        it('should reject a missing email', () => {
            const user = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                displayName: 'joesmith1234',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('email');
        });

        it('should reject an invalid uuid', () => {
            const user: User = {
                id: '59828e85-645b-4364-897d-4299',
                email: 'joe.smith@gmail.com',
                displayName: 'joesmith1234',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('id');
        });

        it('should reject a missing uuid', () => {
            const user = {
                email: 'joe.smith@gmail.com',
                displayName: 'joesmith1234',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('id');
        });

        it('should reject an empty displayName', () => {
            const user: User = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                email: 'joe.smith@gmail.com',
                displayName: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('displayName');
        });

        it('should reject a whitespace-only displayName', () => {
            const user: User = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                email: 'joe.smith@gmail.com',
                displayName: '   ',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('displayName');
        });

        it('should reject a missing displayName', () => {
            const user = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                email: 'joe.smith@gmail.com',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('displayName');
        });

        it('should reject a createdAt without timezone offset', () => {
            const user = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                email: 'joe.smith@gmail.com',
                displayName: 'joesmith1234',
                createdAt: '2026-03-02T14:30:00',
                updatedAt: new Date().toISOString(),
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('createdAt');
        });

        it('should reject a non-datetime createdAt', () => {
            const user = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                email: 'joe.smith@gmail.com',
                displayName: 'joesmith1234',
                createdAt: 'not-a-date',
                updatedAt: new Date().toISOString(),
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('createdAt');
        });

        it('should reject a missing createdAt date', () => {
            const user = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                email: 'joe.smith@gmail.com',
                displayName: 'joesmith1234',
                updatedAt: new Date().toISOString(),
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('createdAt');
        });

        it('should reject an updatedAt without timezone offset', () => {
            const user = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                email: 'joe.smith@gmail.com',
                displayName: 'joesmith1234',
                createdAt: new Date().toISOString(),
                updatedAt: '2026-03-02T14:30:00',
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('updatedAt');
        });

        it('should reject a non-datetime updatedAt', () => {
            const user = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                email: 'joe.smith@gmail.com',
                displayName: 'joesmith1234',
                createdAt: new Date().toISOString(),
                updatedAt: 'not-a-date',
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('updatedAt');
        });

        it('should reject a missing updatedAt date', () => {
            const user = {
                id: '59828e85-645b-4364-897d-4299479b183a',
                email: 'joe.smith@gmail.com',
                displayName: 'joesmith1234',
                createdAt: new Date().toISOString(),
            };

            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('updatedAt');
        });
    });
});

describe('LoginSchema', () => {
    describe('valid inputs', () => {
        it('should parse valid credentials', () => {
            const result = LoginSchema.safeParse({
                email: 'joe.smith@gmail.com',
                password: 'hunter2',
            });
            expect(result.success).toBe(true);
        });

        it('should trim and lowercase the email', () => {
            const result = LoginSchema.safeParse({
                email: '  JOE.SMITH@GMAIL.COM  ',
                password: 'hunter2',
            });
            expect(result.success).toBe(true);
            expect(result.data?.email).toBe('joe.smith@gmail.com');
        });
    });

    describe('invalid inputs', () => {
        it('should reject an invalid email', () => {
            const result = LoginSchema.safeParse({
                email: 'not-an-email',
                password: 'hunter2',
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('email');
        });

        it('should reject a missing password', () => {
            const result = LoginSchema.safeParse({ email: 'joe.smith@gmail.com' });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('password');
        });

        it('should reject a missing email', () => {
            const result = LoginSchema.safeParse({ password: 'hunter2' });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('email');
        });
    });
});

describe('RegisterSchema', () => {
    describe('valid inputs', () => {
        it('should parse valid registration data', () => {
            const result = RegisterSchema.safeParse({
                email: 'joe.smith@gmail.com',
                password: 'supersecret',
                displayName: 'Joe Smith',
            });
            expect(result.success).toBe(true);
        });

        it('should accept a password of exactly 8 characters', () => {
            const result = RegisterSchema.safeParse({
                email: 'joe.smith@gmail.com',
                password: '12345678',
                displayName: 'Joe Smith',
            });
            expect(result.success).toBe(true);
        });

        it('should accept a password of exactly 128 characters', () => {
            const result = RegisterSchema.safeParse({
                email: 'joe.smith@gmail.com',
                password: 'a'.repeat(128),
                displayName: 'Joe Smith',
            });
            expect(result.success).toBe(true);
        });
    });

    describe('invalid inputs', () => {
        it('should reject a password shorter than 8 characters', () => {
            const result = RegisterSchema.safeParse({
                email: 'joe.smith@gmail.com',
                password: 'short',
                displayName: 'Joe Smith',
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('password');
        });

        it('should reject a password longer than 128 characters', () => {
            const result = RegisterSchema.safeParse({
                email: 'joe.smith@gmail.com',
                password: 'a'.repeat(129),
                displayName: 'Joe Smith',
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('password');
        });

        it('should reject an empty displayName', () => {
            const result = RegisterSchema.safeParse({
                email: 'joe.smith@gmail.com',
                password: 'supersecret',
                displayName: '',
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('displayName');
        });

        it('should reject a missing displayName', () => {
            const result = RegisterSchema.safeParse({
                email: 'joe.smith@gmail.com',
                password: 'supersecret',
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('displayName');
        });
    });
});

describe('GameStatusSchema', () => {
    describe('valid inputs', () => {
        it.each(['backlog', 'playing', 'beaten'])("should accept '%s'", (status) => {
            expect(GameStatusSchema.safeParse(status).success).toBe(true);
        });
    });

    describe('invalid inputs', () => {
        it('should reject an unknown status string', () => {
            expect(GameStatusSchema.safeParse('completed').success).toBe(false);
        });

        it('should reject a number', () => {
            expect(GameStatusSchema.safeParse(1).success).toBe(false);
        });

        it('should reject an empty string', () => {
            expect(GameStatusSchema.safeParse('').success).toBe(false);
        });
    });
});

describe('GameSchema', () => {
    const validGame: Game = {
        id: '59828e85-645b-4364-897d-4299479b183a',
        userId: '71928e85-645b-4364-897d-4299479b183b',
        igdbId: 1942,
        title: 'The Witcher 3',
        slug: 'the-witcher-3',
        status: 'backlog',
        statusOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    describe('valid inputs', () => {
        it('should parse a game with only required fields', () => {
            const result = GameSchema.safeParse(validGame);
            expect(result.success).toBe(true);
        });

        it('should parse a fully populated game', () => {
            const result = GameSchema.safeParse({
                ...validGame,
                coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/abc.jpg',
                summary: 'An epic RPG set in a dark fantasy world.',
                genres: ['RPG', 'Action'],
                platforms: ['PC', 'PS4'],
                releaseDate: '2015-05-19T00:00:00.000Z',
                rating: 5,
                review: 'A masterpiece.',
            });
            expect(result.success).toBe(true);
        });

        it('should accept rating at boundary values 1 and 5', () => {
            expect(GameSchema.safeParse({ ...validGame, rating: 1 }).success).toBe(true);
            expect(GameSchema.safeParse({ ...validGame, rating: 5 }).success).toBe(true);
        });

        it('should accept a negative statusOrder (re-ordering edge case)', () => {
            expect(GameSchema.safeParse({ ...validGame, statusOrder: -1 }).success).toBe(true);
        });
    });

    describe('invalid inputs', () => {
        it('should reject a missing title', () => {
            const { title: _title, ...rest } = validGame;
            const result = GameSchema.safeParse(rest);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('title');
        });

        it('should reject an invalid status', () => {
            const result = GameSchema.safeParse({ ...validGame, status: 'wishlist' });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('status');
        });

        it('should reject a non-integer igdbId', () => {
            const result = GameSchema.safeParse({ ...validGame, igdbId: 1942.5 });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('igdbId');
        });

        it('should reject a negative igdbId', () => {
            const result = GameSchema.safeParse({ ...validGame, igdbId: -1 });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('igdbId');
        });

        it('should reject a rating below 1', () => {
            const result = GameSchema.safeParse({ ...validGame, rating: 0 });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('rating');
        });

        it('should reject a rating above 5', () => {
            const result = GameSchema.safeParse({ ...validGame, rating: 6 });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('rating');
        });

        it('should reject a non-integer statusOrder', () => {
            const result = GameSchema.safeParse({ ...validGame, statusOrder: 1.5 });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('statusOrder');
        });

        it('should reject an invalid coverUrl', () => {
            const result = GameSchema.safeParse({
                ...validGame,
                coverUrl: 'not-a-url',
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('coverUrl');
        });
    });
});

describe('IgdbGameSchema', () => {
    const validIgdbGame = {
        id: 1942,
        name: 'The Witcher 3: Wild Hunt',
        slug: 'the-witcher-3-wild-hunt',
    };

    describe('valid inputs', () => {
        it('should parse a minimal IGDB game (required fields only)', () => {
            const result = IgdbGameSchema.safeParse(validIgdbGame);
            expect(result.success).toBe(true);
        });

        it('should parse a fully populated IGDB game', () => {
            const result = IgdbGameSchema.safeParse({
                ...validIgdbGame,
                cover: {
                    id: 101,
                    image_id: 'co1wyy',
                    url: '//images.igdb.com/igdb/image/upload/t_thumb/co1wyy.jpg',
                },
                summary: 'An open-world RPG.',
                genres: [{ id: 12, name: 'Role-playing (RPG)', slug: 'role-playing-rpg' }],
                platforms: [
                    {
                        id: 6,
                        name: 'PC (Microsoft Windows)',
                        slug: 'win',
                        abbreviation: 'PC',
                    },
                ],
                first_release_date: 1431993600,
                rating: 92.5,
                url: 'https://www.igdb.com/games/the-witcher-3-wild-hunt',
            });
            expect(result.success).toBe(true);
        });

        it('should accept rating at IGDB boundary values 0 and 100', () => {
            expect(IgdbGameSchema.safeParse({ ...validIgdbGame, rating: 0 }).success).toBe(true);
            expect(IgdbGameSchema.safeParse({ ...validIgdbGame, rating: 100 }).success).toBe(true);
        });
    });

    describe('invalid inputs', () => {
        it('should reject a missing name', () => {
            const { name: _name, ...rest } = validIgdbGame;
            const result = IgdbGameSchema.safeParse(rest);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('name');
        });

        it('should reject a non-positive id', () => {
            const result = IgdbGameSchema.safeParse({ ...validIgdbGame, id: 0 });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('id');
        });

        it('should reject a rating above 100', () => {
            const result = IgdbGameSchema.safeParse({
                ...validIgdbGame,
                rating: 101,
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('rating');
        });

        it('should reject a cover missing image_id', () => {
            const result = IgdbGameSchema.safeParse({
                ...validIgdbGame,
                cover: { id: 101, url: '//images.igdb.com/co1wyy.jpg' },
            });
            expect(result.success).toBe(false);
        });
    });
});

describe('IgdbSearchResultSchema', () => {
    describe('valid inputs', () => {
        it('should parse an empty array', () => {
            expect(IgdbSearchResultSchema.safeParse([]).success).toBe(true);
        });

        it('should parse an array of valid IGDB games', () => {
            const result = IgdbSearchResultSchema.safeParse([
                { id: 1, name: 'Game A', slug: 'game-a' },
                { id: 2, name: 'Game B', slug: 'game-b' },
            ]);
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });
    });

    describe('invalid inputs', () => {
        it('should reject a non-array value', () => {
            expect(
                IgdbSearchResultSchema.safeParse({ id: 1, name: 'Game', slug: 'game' }).success,
            ).toBe(false);
        });

        it('should reject an array containing an invalid game', () => {
            const result = IgdbSearchResultSchema.safeParse([
                { id: 1, name: 'Good Game', slug: 'good-game' },
                { id: -5, name: 'Bad Game', slug: 'bad-game' },
            ]);
            expect(result.success).toBe(false);
        });
    });
});

describe('OutboxEntrySchema', () => {
    const baseEntry = {
        id: '59828e85-645b-4364-897d-4299479b183a',
        entityId: '71928e85-645b-4364-897d-4299479b183b',
        synced: false,
        createdAt: new Date().toISOString(),
        clientUpdatedAt: new Date().toISOString(),
    };

    const validDeleteEntry = { ...baseEntry, operation: SyncOperations.delete };
    const validCreateEntry = {
        ...baseEntry,
        operation: SyncOperations.create,
        payload: { id: 1942, name: 'The Witcher 3: Wild Hunt', slug: 'the-witcher-3-wild-hunt' },
    };
    const validUpdateEntry = {
        ...baseEntry,
        operation: SyncOperations.update,
        payload: { id: '59828e85-645b-4364-897d-4299479b183a', status: 'playing' },
    };

    describe('valid inputs', () => {
        it('should parse a valid delete entry (no payload)', () => {
            expect(OutboxEntrySchema.safeParse(validDeleteEntry).success).toBe(true);
        });

        it('should parse a valid create entry with an IgdbGame payload', () => {
            expect(OutboxEntrySchema.safeParse(validCreateEntry).success).toBe(true);
        });

        it('should parse a valid update entry with a GameUpdate payload', () => {
            expect(OutboxEntrySchema.safeParse(validUpdateEntry).success).toBe(true);
        });

        it('should parse a synced entry', () => {
            expect(
                OutboxEntrySchema.safeParse({ ...validDeleteEntry, synced: true }).success,
            ).toBe(true);
        });
    });

    describe('invalid inputs', () => {
        it('should reject an invalid operation', () => {
            const result = OutboxEntrySchema.safeParse({ ...baseEntry, operation: 'upsert' });
            expect(result.success).toBe(false);
        });

        it('should reject a create entry missing its payload', () => {
            const { payload: _payload, ...rest } = validCreateEntry;
            const result = OutboxEntrySchema.safeParse(rest);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('payload');
        });

        it('should reject an update entry missing its payload', () => {
            const { payload: _payload, ...rest } = validUpdateEntry;
            const result = OutboxEntrySchema.safeParse(rest);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('payload');
        });

        it('should reject a non-boolean synced', () => {
            const result = OutboxEntrySchema.safeParse({ ...validDeleteEntry, synced: 'false' });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('synced');
        });

        it('should reject an invalid entityId', () => {
            const result = OutboxEntrySchema.safeParse({
                ...validDeleteEntry,
                entityId: 'not-a-uuid',
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('entityId');
        });

        it('should reject a missing createdAt', () => {
            const { createdAt: _createdAt, ...rest } = validDeleteEntry;
            const result = OutboxEntrySchema.safeParse(rest);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('createdAt');
        });

        it('should reject a missing clientUpdatedAt', () => {
            const { clientUpdatedAt: _clientUpdatedAt, ...rest } = validDeleteEntry;
            const result = OutboxEntrySchema.safeParse(rest);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('clientUpdatedAt');
        });
    });
});

describe('VibeRequestSchema', () => {
    describe('valid inputs', () => {
        it('should parse with only required fields', () => {
            const result = VibeRequestSchema.safeParse({
                mood: 'relaxed',
                availableMinutes: 90,
            });
            expect(result.success).toBe(true);
        });

        it('should parse with all fields', () => {
            const result = VibeRequestSchema.safeParse({
                mood: 'competitive',
                availableMinutes: 120,
                preferredGameLength: 'long',
                preferredGenres: ['RPG', 'Strategy'],
            });
            expect(result.success).toBe(true);
        });

        it.each(['short', 'medium', 'long', 'any'])(
            "should accept preferredGameLength '%s'",
            (len) => {
                expect(
                    VibeRequestSchema.safeParse({
                        mood: 'relaxed',
                        availableMinutes: 30,
                        preferredGameLength: len,
                    }).success,
                ).toBe(true);
            },
        );
    });

    describe('invalid inputs', () => {
        it('should reject an empty mood', () => {
            const result = VibeRequestSchema.safeParse({
                mood: '',
                availableMinutes: 60,
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('mood');
        });

        it('should reject zero availableMinutes', () => {
            const result = VibeRequestSchema.safeParse({
                mood: 'relaxed',
                availableMinutes: 0,
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('availableMinutes');
        });

        it('should reject negative availableMinutes', () => {
            const result = VibeRequestSchema.safeParse({
                mood: 'relaxed',
                availableMinutes: -30,
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('availableMinutes');
        });

        it('should reject an invalid preferredGameLength', () => {
            const result = VibeRequestSchema.safeParse({
                mood: 'relaxed',
                availableMinutes: 60,
                preferredGameLength: 'epic',
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('preferredGameLength');
        });
    });
});

describe('RecommendationSchema', () => {
    const validRec = {
        igdbId: 1942,
        title: 'The Witcher 3',
        reason: 'Matches your RPG preference and available time.',
        estimatedSessionMinutes: 90,
        matchScore: 87,
    };

    describe('valid inputs', () => {
        it('should parse a minimal recommendation', () => {
            expect(RecommendationSchema.safeParse(validRec).success).toBe(true);
        });

        it('should parse a recommendation with optional URLs', () => {
            const result = RecommendationSchema.safeParse({
                ...validRec,
                reviewUrl: 'https://www.opencritic.com/game/1942',
                trailerUrl: 'https://www.youtube.com/watch?v=abc123',
            });
            expect(result.success).toBe(true);
        });

        it('should accept matchScore at boundary values 0 and 100', () => {
            expect(RecommendationSchema.safeParse({ ...validRec, matchScore: 0 }).success).toBe(
                true,
            );
            expect(RecommendationSchema.safeParse({ ...validRec, matchScore: 100 }).success).toBe(
                true,
            );
        });
    });

    describe('invalid inputs', () => {
        it('should reject a matchScore above 100', () => {
            const result = RecommendationSchema.safeParse({
                ...validRec,
                matchScore: 101,
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('matchScore');
        });

        it('should reject a matchScore below 0', () => {
            const result = RecommendationSchema.safeParse({
                ...validRec,
                matchScore: -5,
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('matchScore');
        });

        it('should reject a non-integer matchScore', () => {
            const result = RecommendationSchema.safeParse({
                ...validRec,
                matchScore: 87.5,
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('matchScore');
        });

        it('should reject a non-positive estimatedSessionMinutes', () => {
            const result = RecommendationSchema.safeParse({
                ...validRec,
                estimatedSessionMinutes: 0,
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('estimatedSessionMinutes');
        });

        it('should reject an invalid reviewUrl', () => {
            const result = RecommendationSchema.safeParse({
                ...validRec,
                reviewUrl: 'not-a-url',
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('reviewUrl');
        });

        it('should reject an empty reason', () => {
            const result = RecommendationSchema.safeParse({
                ...validRec,
                reason: '',
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('reason');
        });
    });
});

describe('VibeResponseSchema', () => {
    const validRec = {
        igdbId: 1942,
        title: 'The Witcher 3',
        reason: 'Great match for your mood.',
        estimatedSessionMinutes: 90,
        matchScore: 87,
    };

    describe('valid inputs', () => {
        it('should parse a response with recommendations', () => {
            const result = VibeResponseSchema.safeParse({
                recommendations: [validRec],
                summary: 'Based on your relaxed mood, here are some picks.',
            });
            expect(result.success).toBe(true);
        });

        it('should parse a response with an empty recommendations array', () => {
            const result = VibeResponseSchema.safeParse({
                recommendations: [],
                summary: 'No games matched your criteria.',
            });
            expect(result.success).toBe(true);
        });
    });

    describe('invalid inputs', () => {
        it('should reject a missing summary', () => {
            const result = VibeResponseSchema.safeParse({
                recommendations: [validRec],
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('summary');
        });

        it('should reject an empty summary', () => {
            const result = VibeResponseSchema.safeParse({
                recommendations: [validRec],
                summary: '',
            });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain('summary');
        });

        it('should reject a response with an invalid recommendation', () => {
            const result = VibeResponseSchema.safeParse({
                recommendations: [{ ...validRec, matchScore: 150 }],
                summary: 'Some picks for you.',
            });
            expect(result.success).toBe(false);
        });
    });
});
