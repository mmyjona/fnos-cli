const assert = require('node:assert/strict');
const { describe, it } = require('mocha');
const {
  DOWNLOAD_CENTER_ENDPOINTS,
  downloadCenterExtensions
} = require('../../src/utils/download-center-ext');

function fakeClient() {
  const calls = [];
  return {
    calls,
    requestPayloadWithResponse(endpoint, payload, timeout) {
      calls.push({ endpoint, payload, timeout });
      return Promise.resolve({ result: 'succ' });
    }
  };
}

describe('download center extensions', () => {
  it('maps every write command to the endpoint captured from the fnOS web UI', () => {
    assert.deepEqual(DOWNLOAD_CENTER_ENDPOINTS, {
      addUris: 'appcgi.downloadcenter.task.addUris',
      pause: 'appcgi.downloadcenter.task.pause',
      resume: 'appcgi.downloadcenter.task.resume',
      remove: 'appcgi.downloadcenter.task.delete',
      taskInfo: 'appcgi.downloadcenter.task.getInfo',
      taskFiles: 'appcgi.downloadcenter.task.getFiles'
    });
  });

  it('sends the addUris payload shape the download center expects', async () => {
    const client = fakeClient();
    const extensions = downloadCenterExtensions(client);
    await extensions.addUris(['magnet:?xt=urn:btih:abc,def', 'http://host/file.iso'], true, 5000);
    assert.deepEqual(client.calls, [{
      endpoint: 'appcgi.downloadcenter.task.addUris',
      payload: { uris: ['magnet:?xt=urn:btih:abc,def', 'http://host/file.iso'], select_files: true },
      timeout: 5000
    }]);
  });

  it('defaults select_files to false and rejects an empty URI list', async () => {
    const client = fakeClient();
    const extensions = downloadCenterExtensions(client);
    await extensions.addUris(['http://host/file.iso']);
    assert.deepEqual(client.calls[0].payload, { uris: ['http://host/file.iso'], select_files: false });
    await assert.rejects(() => extensions.addUris([]), /At least one download URI/);
    await assert.rejects(() => extensions.addUris(['   ']), /A download URI is required/);
  });

  it('coerces task IDs to numbers for pause, resume and delete', async () => {
    const client = fakeClient();
    const extensions = downloadCenterExtensions(client);
    await extensions.pauseTasks(['7', 8]);
    await extensions.resumeTasks(['9']);
    await extensions.removeTasks(['10'], true);
    assert.deepEqual(client.calls.map((call) => call.endpoint), [
      'appcgi.downloadcenter.task.pause',
      'appcgi.downloadcenter.task.resume',
      'appcgi.downloadcenter.task.delete'
    ]);
    assert.deepEqual(client.calls[0].payload, { ids: [7, 8] });
    assert.deepEqual(client.calls[1].payload, { ids: [9] });
    assert.deepEqual(client.calls[2].payload, { ids: [10], delete_files: true });
  });

  it('rejects task IDs that are not positive integers', async () => {
    const extensions = downloadCenterExtensions(fakeClient());
    await assert.rejects(() => extensions.pauseTasks(['0']), /positive integer/);
    await assert.rejects(() => extensions.pauseTasks(['abc']), /positive integer/);
    await assert.rejects(() => extensions.resumeTasks([]), /At least one task ID/);
  });

  it('reads a single task through getInfo and getFiles', async () => {
    const client = fakeClient();
    const extensions = downloadCenterExtensions(client);
    await extensions.getTaskInfo(318);
    await extensions.getTaskFiles('318');
    assert.deepEqual(client.calls, [
      { endpoint: 'appcgi.downloadcenter.task.getInfo', payload: { id: 318 }, timeout: 10000 },
      { endpoint: 'appcgi.downloadcenter.task.getFiles', payload: { id: 318 }, timeout: 10000 }
    ]);
  });

  it('fails clearly when the client cannot send raw payload requests', async () => {
    const extensions = downloadCenterExtensions({});
    await assert.rejects(() => extensions.pauseTasks([1]), /cannot send raw payload requests/);
  });
});
