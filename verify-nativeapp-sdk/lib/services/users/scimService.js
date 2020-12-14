/**
 * MIT License
 * Copyright 2020 - IBM Corp.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions: The above copyright
 * notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const Service = require('../service');


/**
 * A class for making SCIM related requests.  Includes user lookup, user update,
 * and user password change.
 * @extends Service
 * @author Jon Harry <jonharry@uk.ibm.com>
 */

class ScimService extends Service {
  /**
   * Create a new {@link ScimService} object.
   * @param {Object} auth The credentials for authentication.
   * @param {string} baseURL The base URL for the SCIM API.
   */
  constructor(auth, baseURL) {
    super(auth, baseURL, {}, 'scim+json', 'scim+json');
  }

  /**
   * Get the user associated with token using /2.0/Me endpoint
   *
   * @return {Promise<Object>} The HTTP response body containing SCIM response.
   * @throws {Error} An error response is received.
   */

  async getUser() {
    const response = await this.get('/v2.0/Me');
    return response.data;
  }

  /**
   * Update the user associated with token using /2.0/Me endpoint
   *
   * @return {Promise<Object>} The HTTP response body containing SCIM response.
   * @throws {Error} An error response is received.
   */

  async updateUser(userObject) {
    const response = await this.post('/v2.0/Me',userObject);
    return response.data;
  }

  /**
   * Update password for user associated with token using /2.0/Me endpoint
   *
   * @return {Promise<Object>} The HTTP response body containing SCIM response.
   * @throws {Error} An error response is received.
   */

  async updateUserPassword(updateObject) {
    const response = await this.post('/v2.0/Me/password',updateObject);
    if (response.status == 204) {
      return {status: "success"};
    } else {
      return response;
    }
  }
}

module.exports = ScimService;
