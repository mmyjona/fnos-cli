/**
 * Download center operations that the fnos SDK does not expose.
 *
 * The fnOS download center is a trim front end over aria2 and qBittorrent. Its
 * write endpoints are reachable over the same authenticated WebSocket the rest
 * of this CLI already uses, but fnos 0.5.0 wraps only three read-only calls
 * (getDefaultSaveDirectory, getStatistics, queryTasks).
 *
 * The endpoint names and payload shapes below were captured from the fnOS web
 * UI WebSocket traffic and verified against a live server:
 *   task.addUris  { uris: [...], select_files: false }
 *   task.pause    { ids: [...] }
 *   task.resume   { ids: [...] }
 *   task.delete   { ids: [...], delete_files: true }
 * Adding a URI creates a task that the download center lists like any other
 * one; task IDs come from `fnos download queryTasks`.
 */

const DOWNLOAD_CENTER_ENDPOINTS = Object.freeze({
  addUris: 'appcgi.downloadcenter.task.addUris',
  pause: 'appcgi.downloadcenter.task.pause',
  resume: 'appcgi.downloadcenter.task.resume',
  remove: 'appcgi.downloadcenter.task.delete',
  taskInfo: 'appcgi.downloadcenter.task.getInfo',
  taskFiles: 'appcgi.downloadcenter.task.getFiles'
});

function request(client, endpoint, payload, timeout) {
  if (!client || typeof client.requestPayloadWithResponse !== 'function') {
    throw new Error('The connected fnos client cannot send raw payload requests.');
  }
  return client.requestPayloadWithResponse(endpoint, payload, timeout);
}

function taskIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('At least one task ID is required.');
  }
  return ids.map((value) => {
    const id = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Task ID must be a positive integer: ${value}`);
    }
    return id;
  });
}

function taskUri(uri) {
  if (typeof uri !== 'string' || !uri.trim()) {
    throw new Error('A download URI is required.');
  }
  return uri.trim();
}

/**
 * Build the extra DownloadCenter methods backed by raw payload requests.
 * @param {Object} client - Connected fnos client
 * @returns {Object} Methods merged into the DownloadCenter SDK instance
 */
function downloadCenterExtensions(client) {
  return {
    /**
     * Queue download tasks for the given URIs.
     * @param {string[]} uris - Magnet, http, https, ftp or ftps URIs
     * @param {boolean} selectFiles - Let the user pick files before starting
     * @param {number} timeout - Request timeout in milliseconds
     * @returns {Promise<Object>} fnOS response
     */
    async addUris(uris, selectFiles = false, timeout = 10000) {
      if (!Array.isArray(uris) || uris.length === 0) {
        throw new Error('At least one download URI is required.');
      }
      const payload = { uris: uris.map(taskUri), select_files: selectFiles === true };
      return request(client, DOWNLOAD_CENTER_ENDPOINTS.addUris, payload, timeout);
    },

    /**
     * Pause download tasks.
     * @param {Array<number|string>} ids - Task IDs
     * @param {number} timeout - Request timeout in milliseconds
     * @returns {Promise<Object>} fnOS response
     */
    async pauseTasks(ids, timeout = 10000) {
      return request(client, DOWNLOAD_CENTER_ENDPOINTS.pause, { ids: taskIds(ids) }, timeout);
    },

    /**
     * Resume download tasks.
     * @param {Array<number|string>} ids - Task IDs
     * @param {number} timeout - Request timeout in milliseconds
     * @returns {Promise<Object>} fnOS response
     */
    async resumeTasks(ids, timeout = 10000) {
      return request(client, DOWNLOAD_CENTER_ENDPOINTS.resume, { ids: taskIds(ids) }, timeout);
    },

    /**
     * Remove download tasks.
     * @param {Array<number|string>} ids - Task IDs
     * @param {boolean} deleteFiles - Also delete the downloaded files
     * @param {number} timeout - Request timeout in milliseconds
     * @returns {Promise<Object>} fnOS response
     */
    async removeTasks(ids, deleteFiles = false, timeout = 10000) {
      const payload = { ids: taskIds(ids), delete_files: deleteFiles === true };
      return request(client, DOWNLOAD_CENTER_ENDPOINTS.remove, payload, timeout);
    },

    /**
     * Read one download task in detail.
     * @param {number} id - Task ID
     * @param {number} timeout - Request timeout in milliseconds
     * @returns {Promise<Object>} fnOS response
     */
    async getTaskInfo(id, timeout = 10000) {
      const [taskId] = taskIds([id]);
      return request(client, DOWNLOAD_CENTER_ENDPOINTS.taskInfo, { id: taskId }, timeout);
    },

    /**
     * Read the file list of one download task.
     * @param {number} id - Task ID
     * @param {number} timeout - Request timeout in milliseconds
     * @returns {Promise<Object>} fnOS response
     */
    async getTaskFiles(id, timeout = 10000) {
      const [taskId] = taskIds([id]);
      return request(client, DOWNLOAD_CENTER_ENDPOINTS.taskFiles, { id: taskId }, timeout);
    }
  };
}

module.exports = { DOWNLOAD_CENTER_ENDPOINTS, downloadCenterExtensions };
