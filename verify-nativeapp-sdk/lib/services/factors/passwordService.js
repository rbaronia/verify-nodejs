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

const FactorService = require('../factors/factorService');


/**
 * A class for making password related requests to OIDC.
 * @extends FactorService
 * @author Adam Dorogi-Kaposi <adam.dorogi-kaposi@ibm.com>
 */
class PasswordService extends FactorService {
  /**
   * Get identity source ID for a sourceName.
   * @param {string} sourceName The name of the Identity Source.
   * @return {Promise<Object>} The array of sources returned.
   */
  async lookupIdentitySources(sourceName) {
    var response;
    if (sourceName) {
      response = await this.get(
          '/v1.0/authnmethods/password?search=name = "' + sourceName + '"');
    } else {
      response = await this.get(
          '/v1.0/authnmethods/password');
    }
    return response.data.password;
  }

  /**
   * Attempt password authentication with an identity source.
   * @param {string} identitySourceId The identifier of an identity source
   * resolved in {@link PasswordService#resolveIdentitySource}.
   * @param {string} username The username to authenticate as.
   * @param {string} password The password to authenticate with.
   * @return {Promise<Object>} The HTTP response body of the authentication.
   * This response body also includes the JWT to be validated by OIDC in
   * {@link PolicyService#validate}.
   */
  async authenticate(identitySourceId, username, password) {
    const response = await this.post(
        `/v1.0/authnmethods/password/${identitySourceId}`,
        {username, password}, {returnJwt: true});
    return response.data;
  }
}

module.exports = PasswordService;
