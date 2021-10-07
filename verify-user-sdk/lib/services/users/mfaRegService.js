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
 * A class for registration of authentication factors.
 * Initially FIDO2
 * @extends Service
 * @author Jon Harry <jonharry@uk.ibm.com>
 */

class MfaRegistrationService extends Service {
  /**
   * Create a new {@link MfaRegistrationService} object.
   * @param {Object} auth The credentials for authentication.
   * @param {string} baseURL The base URL for the tenant.
   */
  constructor(auth, baseURL) {
    super(auth, baseURL, {}, 'json', 'json');
  }

  /**
   * Get the FIDO2 relying parties for an origin
   * @param {string} origin The origin for the Relying Party - a URL
   * @return {Promise<Object>} The HTTP response body containing SCIM response.
   * @throws {Error} An error response is received.
   */
  async getFidoRelyingParties(origin) {
    let data = {"origin": origin};
    const response = await this.post('/v2.0/factors/fido2/relyingparties',data);
    return response.data.fido2;
  }

  /**
   * Get FIDO2 attestation options
   * @param {object} fidoRP FIDO RP object from {@link getFidoRelyingParties}
   * @param {string} displayName The display name to use for registration.
   * @return {Promise<Object>} Attestation options
   * @throws {Error} An error response is received.
   */
  async getFidoAttestationOptions(fidoRP, displayName) {
    if (fidoRP && fidoRP.id) {
      let data = {
        authenticatorSelection: {
          requireResidentKey: true,
          userVerification: "preferred"
        },
        attestation: "none"
      };

      if (displayName) {
        data.displayName = displayName;
      }

      const response = await this.post(fidoRP.attestationOptionsPath,data);
      return response.data;
    }
  }

  /**
   * Process attestation result
   * @param {object} fidoRP FIDO RP object from {@link getFidoRelyingParties}
   * @param {object} data The data returned from WebAuthn call.
   * @return {Promise<Object>} Registration result
   * @throws {Error} An error response is received.
   */
  async processFidoAttestationResult(fidoRP, data) {
    if (fidoRP && fidoRP.id && data) {
      const response = await this.post(fidoRP.attestationResultPath,data);
      return response.data;
    } else {
      throw "Missing input parameters."
    }
  }
}

module.exports = MfaRegistrationService;
