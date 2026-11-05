import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, setLogLevel, updateDoc } from 'firebase/firestore';

// This suite must never select a real Firebase project or connect off this PC.
const address = /^127\.0\.0\.1:(\d+)$/.exec(process.env.FIRESTORE_EMULATOR_HOST ?? '');
if (!address) throw new Error('Run this suite with the local Firestore emulator on 127.0.0.1.');
const projectId = 'demo-storm-mnemonic-rules';
let environment;
setLogLevel('silent');

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: Number(address[1]),
      rules: await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8'),
    },
  });
}, { timeout: 30_000 });
beforeEach(async () => environment.clearFirestore());
after(async () => environment?.cleanup());

const database = (uid = 'owner') => environment.authenticatedContext(uid, {
  firebase: { sign_in_provider: 'anonymous' },
}).firestore();

function completeDocument(codeKey) {
  const data = { [codeKey]: { '0': 'S, Z' }, '0-9': { '0': 'Oso' } };
  for (let decade = 0; decade < 10; decade++) {
    data[`${decade}0-${decade}9`] = Object.fromEntries(
      Array.from({ length: 10 }, (_, index) => [`${decade}${index}`, `Palabra ${index}`]),
    );
  }
  // Exercise the maximum document size allowed by the application schema.
  data[codeKey] = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [String(index), 's, z']));
  data['0-9'] = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [String(index), 'Oso']));
  return data;
}

for (const [collectionName, codeKey, otherCodeKey] of [
  ['mnemonic_words', 'Código', 'Code'],
  ['mnemonic_words_en', 'Code', 'Código'],
]) {
  describe(`${collectionName} rules`, () => {
    const reference = (db = database(), uid = 'owner') => doc(db, collectionName, uid);

    it('allows an anonymous Firebase user to create, read and delete only their own document', async () => {
      const ref = reference();
      await assertSucceeds(setDoc(ref, completeDocument(codeKey)));
      assert.equal((await assertSucceeds(getDoc(ref))).exists(), true);
      await assertSucceeds(deleteDoc(ref));
    });

    it('preserves partial range documents and merge updates', async () => {
      const ref = reference();
      await assertSucceeds(setDoc(ref, { '0-9': { '0': 'Oso' } }));
      await assertSucceeds(setDoc(ref, { '10-19': { '10': 'TaZa' } }, { merge: true }));
      await assertSucceeds(setDoc(ref, { '0-9': { '1': 'auTo' } }, { merge: true }));
      assert.deepEqual((await getDoc(ref)).data(), { '0-9': { '0': 'Oso', '1': 'auTo' }, '10-19': { '10': 'TaZa' } });
    });

    it('accepts empty words and the 100 character boundary including accents', async () => {
      await assertSucceeds(setDoc(reference(), { [codeKey]: { '0': '' }, '00-09': { '00': 'é'.repeat(100) } }));
    });

    it('denies reads, creates, updates and deletes for another UID', async () => {
      await setDoc(reference(), { '0-9': { '0': 'Oso' } });
      const foreign = reference(database('other'));
      await assertFails(getDoc(foreign));
      await assertFails(setDoc(foreign, { '0-9': { '0': 'Changed' } }));
      await assertFails(updateDoc(foreign, { '0-9.0': 'Changed' }));
      await assertFails(deleteDoc(foreign));
      await assertFails(setDoc(reference(database('other'), 'new-owner'), { '0-9': { '0': 'Oso' } }));
    });

    it('denies unauthenticated access while retaining Firebase anonymous authentication support', async () => {
      await setDoc(reference(), { '0-9': { '0': 'Oso' } });
      const unauthenticated = reference(environment.unauthenticatedContext().firestore());
      await assertFails(getDoc(unauthenticated));
      await assertFails(setDoc(unauthenticated, { '0-9': { '0': 'Changed' } }));
      await assertFails(deleteDoc(unauthenticated));
    });

    it('does not allow listing other users or creating subcollections', async () => {
      await assertFails(getDocs(collection(database(), collectionName)));
      await assertFails(setDoc(doc(database(), collectionName, 'owner', 'extra', 'doc'), { value: 'extra' }));
    });

    const invalidDocuments = [
      ['unknown top-level range', { extra: { '0': 'x' } }],
      ['wrong localized code key', { [otherCodeKey]: { '0': 'x' } }],
      ['range as a string', { '0-9': 'Oso' }],
      ['range as a list', { '0-9': ['Oso'] }],
      ['range as null', { '0-9': null }],
      ['nested arbitrary map', { '0-9': { '0': { nested: 'x' } } }],
      ['word as a list', { '0-9': { '0': ['Oso'] } }],
      ['word as a number', { '0-9': { '0': 42 } }],
      ['word as a boolean', { '0-9': { '0': true } }],
      ['word as null', { '0-9': { '0': null } }],
      ['unexpected numeric key', { '0-9': { '00': 'Oso' } }],
      ['unexpected text key', { '0-9': { unexpected: 'x' } }],
      ['missing leading zero', { '00-09': { '0': 'Oso' } }],
      ['wrong decade', { '10-19': { '20': 'x' } }],
      ['more than ten keys in a range', { '0-9': { ...completeDocument(codeKey)['0-9'], '10': 'x' } }],
      ['word over the limit', { '90-99': { '99': 'x'.repeat(101) } }],
      ['NUL separator inside a word', { '0-9': { '0': 'a\u0000b' } }],
      ['attempt to split an oversized word', { '0-9': { '0': 'a'.repeat(100) + '\u0000' + 'b'.repeat(100) } }],
      ['mixed strings and coercible numbers', { '0-9': { '0': '42', '1': 42 } }],
    ];
    for (const [reason, data] of invalidDocuments) {
      it(`rejects ${reason} on create and update`, async () => {
        const ref = reference();
        await assertFails(setDoc(ref, data));
        await setDoc(ref, { '0-9': { '0': 'Oso' } });
        await assertFails(setDoc(ref, data, { merge: true }));
        assert.deepEqual((await getDoc(ref)).data(), { '0-9': { '0': 'Oso' } });
      });
    }

    it('keeps legacy ranges unchanged while allowing gradual repairs without recursive merge leftovers', async () => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(reference(context.firestore()), { '0-9': { '0': { legacy: true }, unexpected: 'legacy' } });
      });
      const ref = reference();
      await assertSucceeds(getDoc(ref));
      await assertSucceeds(setDoc(ref, { '10-19': { '10': 'TaZa' } }, { mergeFields: ['10-19'] }));
      await assertFails(updateDoc(ref, { '0-9.0': { changed: true } }));
      await assertFails(setDoc(ref, { '20-29': { '20': 20 } }, { mergeFields: ['20-29'] }));
      await assertFails(setDoc(ref, { '0-9': { '0': 'Oso' } }, { merge: true }));
      await assertSucceeds(setDoc(ref, { '0-9': { '0': 'Oso' } }, { mergeFields: ['0-9'] }));
      assert.deepEqual((await getDoc(ref)).data(), { '0-9': { '0': 'Oso' }, '10-19': { '10': 'TaZa' } });
      await assertSucceeds(deleteDoc(ref));
    });
  });
}

it('denies all unrelated collections', async () => {
  const ref = doc(database(), 'private', 'owner');
  await assertFails(getDoc(ref));
  await assertFails(setDoc(ref, { '0-9': { '0': 'Oso' } }));
});
