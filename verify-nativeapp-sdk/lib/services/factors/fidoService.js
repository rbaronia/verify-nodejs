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
 * A class for making FIDO related requests to OIDC. These include initiating
 * and completing a FIDO verification.
 * @extends FactorService
 * @author Adam Dorogi-Kaposi <adam.dorogi-kaposi@ibm.com>
 */
class FIDOService extends FactorService {
  /**
   * Initiate a FIDO verification.
   * @param {string} relyingPartyId The identifier of a relying party resolved
   * in {@link FIDOService#resolveRelyingParty}.
   * @param {string} userId The identifier of the OIDC user for which to
   * initiate FIDO verification.
   * @return {Promise<Object>} The assertion options, containing FIDO
   * credentials.
   */
  async generate(relyingPartyId, userId) {
    const response = await this.post(`/v2.0/factors/fido2/relyingparties/` +
        `${relyingPartyId}/assertion/options`, {userVerification: 'preferred',
      userId});
    return response.data;
  }

  /**
   * Complete a FIDO verification.
   * @param {string} relyingPartyId The identifier of a relying party resolved
   * in {@link FIDOService#resolveRelyingParty}.
   * @param {string} credentialId The identifier of a FIDO credential received
   * in the assertion options in {@link FIDOService#generate}.
   * @param {string} clientDataJSON The assertion options received in
   * {@link FIDOService#generate}, in Base64 URL encoded format.
   * @param {string} authenticatorData The information about the authenticator
   * used for the FIDO verification, verified by the signature.
   * @param {string} [userHandle] The identifier of the user who owns the
   * authenticator used for the FIDO verification.
   * @param {string} signature The challenge received in
   * {@link FIDOService#generate}, signed by the authenticator used
   * for the FIDO verification, in Base64 URL encoded format.
   * @return {Promise<string>} The JWT to be validated by OIDC in
   * {@link PolicyService#validate}.
   */
  async evaluate(relyingPartyId, credentialId, clientDataJSON,
      authenticatorData, userHandle, signature) {
    const response = await this.post(
        `/v2.0/factors/fido2/relyingparties/${relyingPartyId}/assertion/result`,
        {
          type: 'public-key',
          rawId: credentialId,
          response: {
            clientDataJSON,
            authenticatorData,
            userHandle,
            signature,
          },
          id: credentialId,
        }, {returnJwt: true});
    return response.data;
  }
}

module.exports = FIDOService;
