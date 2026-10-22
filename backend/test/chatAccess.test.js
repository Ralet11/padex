const test = require('node:test');
const assert = require('node:assert/strict');
const { findAcceptedConnection, registerChatSubscriptions } = require('../src/services/chatAccess');
const accepted = { id: 7, requester_id: 1, addressee_id: 2 };
const model = { findOne: async ({where}) => where.id === 7 && where.status === 'accepted' ? accepted : null };
for (const member of [1, 2, '2']) {
  test(`accepted participant ${member} is authorized`, async () => assert.equal(await findAcceptedConnection(model, 7, member), accepted));
}
test('outsiders and unknown connections are denied', async () => {
  assert.equal(await findAcceptedConnection(model, 7, 3), null);
  assert.equal(await findAcceptedConnection(model, 8, 1), null);
});
test('invalid identifiers never query storage', async () => {
  const noQuery = { findOne: () => assert.fail('invalid input queried storage') };
  for (const id of [null, undefined, '', 0, -1, 'x', 1.5, {}, [], [7], true]) assert.equal(await findAcceptedConnection(noQuery, id, 1), null);
});
function setup(userId, storage = model) {
  const handlers = {}, joined = [], emitted = [];
  const socket = { user: { id: userId }, on: (name, fn) => handlers[name] = fn,
    join: async room => joined.push(room), to: room => ({ emit: (name, data) => emitted.push({room, name, data}) }) };
  registerChatSubscriptions(socket, storage, { error() {} });
  return {handlers, joined, emitted};
}
test('outsider cannot subscribe or inject typing', async () => {
  const s = setup(3); let response;
  await s.handlers.join_connection(7, result => response = result);
  await s.handlers.typing({ connection_id: 7 });
  assert.deepEqual(s.joined, []); assert.deepEqual(s.emitted, []); assert.deepEqual(response, {ok:false});
});
test('member joins canonical room and typing rechecks membership', async () => {
  const s = setup(1); await s.handlers.join_connection('7'); await s.handlers.typing({connection_id:7});
  assert.deepEqual(s.joined, ['conn_7']); assert.equal(s.emitted[0].room, 'conn_7');
});
test('storage failures fail closed and malformed payloads do not throw', async () => {
  const s = setup(1, { findOne: async () => { throw new Error('unavailable'); } });
  await s.handlers.join_connection(7); await s.handlers.typing(null); await s.handlers.typing({connection_id:7});
  assert.deepEqual(s.joined, []); assert.deepEqual(s.emitted, []);
});

for (const status of ['pending', 'rejected']) {
  test(`${status} connections cannot subscribe`, async () => {
    const storage = { findOne: async ({where}) => where.status === status ? accepted : null };
    const s = setup(1, storage); await s.handlers.join_connection(7);
    await s.handlers.typing({connection_id:7});
    assert.deepEqual(s.joined, []); assert.deepEqual(s.emitted, []);
  });
}
