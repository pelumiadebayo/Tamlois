import { describe, expect, it } from 'vitest';
import { createRepositories } from '../repositories/factory';
import { LocalRepository } from '../repositories/localRepository';

describe('repository switching', () => {
  it('uses local repositories in demo mode', () => expect(createRepositories('demo').services).toBeInstanceOf(LocalRepository));
  it('requires Firestore in firebase mode', () => expect(() => createRepositories('firebase')).toThrow('Firestore is required'));
});
