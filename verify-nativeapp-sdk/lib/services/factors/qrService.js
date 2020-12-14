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
 * A class for making QR login related requests to OIDC.
 * @extends FactorService
 * @author Adam Dorogi-Kaposi <adam.dorogi-kaposi@ibm.com>
 */
class QRService extends FactorService {
  /**
   * Initiate a QR login verification.
   * @param {string} profileId The identifier of an IBM Verify registration
   * profile.
   * @return {Promise<Object>} The QR code login verification.
   */
  async generate(profileId) {
    const response = await this.get('/v2.0/factors/qr/authenticate',
        {profileId});
    return response.data;
  }

  /**
   * Complete a QR login verification.
   * @param {string} verificationId The identifier of the QR login verification
   * received in {@link QRService#generate}.
   * @param {string} lsi The LSI of the QR login verification received in
   * {@link QRService#generate}.
   * @return {Promise<string>} The HTTP response body of the request.
   */
  async verify(verificationId, lsi) {
    const response = await this.post(`/v2.0/factors/qr/${verificationId}`,
        {lsi}, {returnJwt: true});
    return response.data;
  }
}

module.exports = QRService;
